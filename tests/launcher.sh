#!/bin/sh
# Test of the launchers and of the install and uninstall targets of the Makefile.
# A file name with a space must reach lib/md-view unchanged, through the checkout
# launcher bin/md-view and through the installed launcher. make install and
# make uninstall must refuse a PREFIX with a single quote. make install must replace
# a symlink at bin/md-view and must not write through it. Each case runs in a
# subshell with a fresh HOME, XDG folders and TMPDIR under one temporary folder.
#
# usage: sh tests/launcher.sh
# Prints "ok <case>" or "FAIL <case>" for each case. It exits 1 on any failure.

LC_ALL=C
export LC_ALL

here=$(cd "$(dirname -- "$0")" && pwd) || exit 1
root=$(cd "$here/.." && pwd) || exit 1

tmp=$(mktemp -d "${TMPDIR:-/tmp}/launcher.XXXXXX") || exit 1
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' INT TERM HUP
tmp=$(cd "$tmp" && pwd) || exit 1

fails=0

# fail MESSAGE: ends the case with a failure. Only called inside a case subshell.
fail() {
    echo "  $*" >&2
    exit 1
}

# fresh CASE: a new HOME, XDG folders and TMPDIR for one case. Sets d, the case
# folder. It makes "in dir/a b.md", a Markdown file whose name has a space.
fresh() {
    d=$tmp/$1
    mkdir -p "$d/home" "$d/config" "$d/cache" "$d/tmp" "$d/in dir" "$d/out dir" || fail "mkdir"
    HOME=$d/home
    XDG_CONFIG_HOME=$d/config
    XDG_CACHE_HOME=$d/cache
    TMPDIR=$d/tmp
    export HOME XDG_CONFIG_HOME XDG_CACHE_HOME TMPDIR
    printf '# Spaced name\n\nMARK-SPACE\n' > "$d/in dir/a b.md" || fail "write the input"
}

# page_ok PAGE: true when PAGE is not empty and holds the text of the input.
page_ok() {
    test -s "$1" && grep -q MARK-SPACE "$1"
}

# mode_is FILE MODE: true when ls -l shows MODE for FILE, for example -rwxr-xr-x.
mode_is() {
    [ "$(ls -l "$1" 2>/dev/null | cut -c1-10)" = "$2" ]
}

# make_run TARGET PREFIX: runs make TARGET for the checkout under PREFIX. Fails the case
# when make fails.
make_run() {
    make -C "$root" "$1" PREFIX="$2" > "$d/$1.log" 2>&1 || { cat "$d/$1.log" >&2; fail "make $1 failed"; }
}

# checkout_space: the checkout launcher, found first on PATH, passes a name with a space.
checkout_space() {
    fresh checkout_space
    PATH=$root/bin:$PATH
    export PATH
    [ "$(command -v md-view)" = "$root/bin/md-view" ] || fail "PATH does not find the checkout launcher"
    cd / || fail "cd /"
    md-view "$d/in dir/a b.md" --no-open --out "$d/out dir/o.html" || fail "md-view exit $?"
    page_ok "$d/out dir/o.html" || fail "the page is missing or lacks the text"
}

# installed_space: make install under a PREFIX with a space. The installed files have
# modes 755 and 644, and the installed launcher passes a name with a space.
installed_space() {
    fresh installed_space
    pre="$d/pre fix"
    make_run install "$pre"
    mode_is "$pre/bin/md-view" -rwxr-xr-x || fail "bin/md-view is not mode 755"
    mode_is "$pre/share/md-view/md-view" -rwxr-xr-x || fail "share/md-view/md-view is not mode 755"
    for f in "$root"/lib/*; do
        b=$(basename -- "$f")
        [ "$b" = md-view ] && continue
        mode_is "$pre/share/md-view/$b" -rw-r--r-- || fail "$b is missing or not mode 644"
    done
    cd / || fail "cd /"
    "$pre/bin/md-view" "$d/in dir/a b.md" --no-open --out "$d/out dir/o.html" || fail "installed md-view exit $?"
    page_ok "$d/out dir/o.html" || fail "the page is missing or lacks the text"
}

# quote_refused: make install and make uninstall stop at a PREFIX with a single quote,
# and they make no folder under that PREFIX.
quote_refused() {
    fresh quote_refused
    q="$d/it's"
    for t in install uninstall; do
        if make -C "$root" "$t" PREFIX="$q" > "$d/$t.log" 2>&1; then
            fail "make $t accepted a PREFIX with a single quote"
        fi
        grep -q 'single quote' "$d/$t.log" || fail "make $t gave no single quote message"
    done
    test ! -e "$q" || fail "a folder was made under the PREFIX with a single quote"
    for t in install uninstall; do
        if (cd "$d" && make -f "$root/Makefile" "$t" PREFIX=rel > "$d/rel-$t.log" 2>&1); then
            fail "make $t accepted a relative PREFIX"
        fi
        grep -q 'absolute' "$d/rel-$t.log" || fail "make $t gave no absolute path message"
    done
    test ! -e "$d/rel" || fail "a folder was made under a relative PREFIX"
}

# uninstall_only_own: make uninstall removes the 11 installed files, and keeps the
# folder share/md-view while it holds another file.
uninstall_only_own() {
    fresh uninstall_only_own
    pre="$d/pre"
    make_run install "$pre"
    printf 'keep\n' > "$pre/share/md-view/keep.txt" || fail "write keep.txt"
    make_run uninstall "$pre"
    test ! -e "$pre/bin/md-view" || fail "bin/md-view stays after uninstall"
    for f in "$root"/lib/*; do
        b=$(basename -- "$f")
        test ! -e "$pre/share/md-view/$b" || fail "$b stays after uninstall"
    done
    test -f "$pre/share/md-view/keep.txt" || fail "keep.txt was removed"
}

# uninstall_empty_folder: after a plain install, make uninstall removes bin/md-view and
# the folder share/md-view, which then holds nothing.
uninstall_empty_folder() {
    fresh uninstall_empty_folder
    pre="$d/pre"
    make_run install "$pre"
    make_run uninstall "$pre"
    test ! -e "$pre/bin/md-view" || fail "bin/md-view stays after uninstall"
    test ! -e "$pre/share/md-view" || fail "share/md-view stays after uninstall"
}

# install_over_symlink: a symlink at bin/md-view that points to another file is replaced.
# make install leaves that file unchanged and makes bin/md-view a regular file of mode 755.
install_over_symlink() {
    fresh install_over_symlink
    pre="$d/pre"
    mkdir -p "$pre/bin" || fail "mkdir bin"
    printf 'scratch\n' > "$d/scratch" || fail "write scratch"
    ln -s "$d/scratch" "$pre/bin/md-view" || fail "make the symlink"
    make_run install "$pre"
    [ "$(cat "$d/scratch")" = scratch ] || fail "make install wrote through the symlink"
    mode_is "$pre/bin/md-view" -rwxr-xr-x || fail "bin/md-view is not a regular file of mode 755"
}

# run CASE: runs one case in a subshell and prints its result.
run() {
    if ( "$1" ) > "$tmp/$1.log" 2>&1; then
        echo "ok $1"
    else
        echo "FAIL $1"
        cat "$tmp/$1.log"
        fails=$((fails + 1))
    fi
}

for c in checkout_space installed_space quote_refused uninstall_only_own uninstall_empty_folder install_over_symlink; do
    run "$c"
done

if [ "$fails" -eq 0 ]; then
    echo "all checks pass"
    exit 0
fi
echo "$fails check(s) failed"
exit 1
