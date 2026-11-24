#!/bin/sh
# Unit tests of the internal helpers of lib/md-view. The script is sourced
# with MD_VIEW_SOURCE_ONLY=1, so it defines the helpers and exits without
# reading a flag, a config or a browser. Each case prints "ok <case>" or
# "FAIL <case>". The temp files live under one mktemp folder, removed on exit.
#
# usage: sh tests/unit-helpers.sh
# Prints "ok <case>" or "FAIL <case>" for each case. It exits 1 on any failure.

LC_ALL=C
export LC_ALL

here=$(cd "$(dirname -- "$0")" && pwd) || exit 1
root=$(cd "$here/.." && pwd) || exit 1
cd "$root" || exit 1

tmp=$(mktemp -d "${TMPDIR:-/tmp}/unit-helpers.XXXXXX") || exit 1
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' INT TERM HUP
tmp=$(cd "$tmp" && pwd) || exit 1

fails=0

# mk_fail CASE: marks CASE failed.
mk_fail() {
    echo "FAIL $1"
    fails=$((fails + 1))
}

# mk_ok CASE: marks CASE passed.
mk_ok() {
    echo "ok $1"
}

MD_VIEW_SOURCE_ONLY=1
export MD_VIEW_SOURCE_ONLY
. ./lib/md-view || exit 1
unset MD_VIEW_SOURCE_ONLY

# trim
trim '  a b  '
[ "$trimmed" = 'a b' ] && mk_ok trim || mk_fail trim
trim "$(printf '\t a b\t ')"
[ "$trimmed" = 'a b' ] && mk_ok trim_tabs || mk_fail trim_tabs

# palette_ok
palette_ok github && mk_ok palette_ok_github || mk_fail palette_ok_github
palette_ok tokyo && mk_ok palette_ok_tokyo || mk_fail palette_ok_tokyo
palette_ok bad && mk_fail palette_ok_bad || mk_ok palette_ok_bad

# num_val
num_val 70 90 && [ "$num" = 70 ] && mk_ok num_val_70 || mk_fail num_val_70
num_val 99999999 90 && [ "$num" = 90 ] && mk_ok num_val_clamp || mk_fail num_val_clamp
num_val 123456 90 && [ "$num" = 90 ] && mk_ok num_val_6digit || mk_fail num_val_6digit
num_val 0 90 && mk_fail num_val_zero || { [ -z "$num" ] && mk_ok num_val_zero || mk_fail num_val_zero; }
num_val 1x 90 && mk_fail num_val_nonnumeric || { [ -z "$num" ] && mk_ok num_val_nonnumeric || mk_fail num_val_nonnumeric; }
num_val '' 90 && mk_fail num_val_empty || { [ -z "$num" ] && mk_ok num_val_empty || mk_fail num_val_empty; }

# browser_ok
for w in auto firefox chrome safari; do
    browser_ok "$w" && mk_ok "browser_ok_$w" || mk_fail "browser_ok_$w"
done
browser_ok /no/such/file && mk_fail browser_ok_missing || mk_ok browser_ok_missing
printf '#!/bin/sh\nexit 0\n' > "$tmp/exec.sh" && chmod 755 "$tmp/exec.sh"
browser_ok "$tmp/exec.sh" && mk_ok browser_ok_exec || mk_fail browser_ok_exec
mkdir -p "$tmp/plain.dir"
browser_ok "$tmp/plain.dir" && mk_fail browser_ok_plain_dir || mk_ok browser_ok_plain_dir
mkdir -p "$tmp/App.app"
if [ "$(uname -s)" = Darwin ]; then
    browser_ok "$tmp/App.app" && mk_ok browser_ok_app_dir || mk_fail browser_ok_app_dir
else
    browser_ok "$tmp/App.app" && mk_fail browser_ok_app_dir || mk_ok browser_ok_app_dir
fi
printf 'plain\n' > "$tmp/noexec.txt" && chmod 644 "$tmp/noexec.txt"
browser_ok "$tmp/noexec.txt" && mk_fail browser_ok_noexec || mk_ok browser_ok_noexec
browser_ok notaword && mk_fail browser_ok_relative || mk_ok browser_ok_relative

# bake_ok with tree_depth=6
tree_depth=6
bake_ok 'a/b/c.md' && mk_ok bake_ok_nested || mk_fail bake_ok_nested
bake_ok '.git/config' && mk_fail bake_ok_dot || mk_ok bake_ok_dot
bake_ok 'a/node_modules/b.md' && mk_fail bake_ok_node_modules || mk_ok bake_ok_node_modules
bake_ok "a/$(printf '\001')b.md" && mk_fail bake_ok_ctl || mk_ok bake_ok_ctl
bake_ok 'a/b/c/d/e/f/g/h.md' && mk_fail bake_ok_depth || mk_ok bake_ok_depth

# bake_ext_ok
bake_ext_ok pic.PNG && mk_ok bake_ext_ok_png || mk_fail bake_ext_ok_png
bake_ext_ok pic.jpeg && mk_ok bake_ext_ok_jpeg || mk_fail bake_ext_ok_jpeg
bake_ext_ok notes.md && mk_fail bake_ext_ok_md || mk_ok bake_ext_ok_md

# bake_link_chain with tree_root under the temp folder
tree_root=$(mktemp -d "$tmp/tree.XXXXXX") || exit 1
mkdir -p "$tree_root/a" || exit 1
printf 'x\n' > "$tree_root/a/b.md" || exit 1
ln -s "$tree_root/a" "$tree_root/link" || exit 1
bake_link_chain 'link/b.md' && mk_fail bake_link_chain_symlink || mk_ok bake_link_chain_symlink
bake_link_chain 'a/b.md' && mk_ok bake_link_chain_plain || mk_fail bake_link_chain_plain

# head_has_all with no arguments
head_has_all && mk_ok head_has_all_none || mk_fail head_has_all_none

# url_escape
[ "$(url_escape 'a b')" = 'a%20b' ] && mk_ok url_escape_space || mk_fail url_escape_space
[ "$(url_escape '%')" = '%25' ] && mk_ok url_escape_percent || mk_fail url_escape_percent
[ "$(url_escape "$(printf 'a\nb')")" = 'a%0Ab' ] && mk_ok url_escape_newline || mk_fail url_escape_newline
[ "$(url_escape '<>&"?#')" = '%3C%3E%26%22%3F%23' ] && mk_ok url_escape_specials || mk_fail url_escape_specials

# enc_path
[ "$(enc_path 'a b')" = 'a%20b' ] && mk_ok enc_path_space || mk_fail enc_path_space
[ "$(enc_path '%')" = '%25' ] && mk_ok enc_path_percent || mk_fail enc_path_percent
if [ "$(printf '\303\251' | LC_ALL=C awk '{print length($0)}')" = 2 ]; then
    [ "$(enc_path "$(printf 'a\303\251')")" = 'a%C3%A9' ] && mk_ok enc_path_utf8 || mk_fail enc_path_utf8
else
    echo "skip enc_path_utf8 (awk is UTF-8 aware)"
fi

enc_path "x
" | grep -q 'x%0A$' && mk_ok enc_path_trailing_nl || mk_fail enc_path_trailing_nl

# head_has_all on a three-line-head fixture
page="$tmp/head.html"
printf '<head>\n<meta name="a">\n</head>\n<body>\n' > "$page" || exit 1
head_has_all '<head>' '<meta name="a">' '</head>' && mk_ok head_has_all_present || mk_fail head_has_all_present
head_has_all '<head>' '<meta name="missing">' && mk_fail head_has_all_missing || mk_ok head_has_all_missing
head_has_all '<meta name="a"' && mk_fail head_has_all_substring || mk_ok head_has_all_substring

[ "$fails" -eq 0 ] || exit 1
exit 0
