#!/bin/sh
# Hostile-input check of md-view in headless Chrome: escapes, raw HTML as text,
# blocked remote images, the source of a broken diagram, the CSP, the page
# written with --out, and the File associations command with a hostile file
# name. Each row runs in a subshell with a fresh HOME, XDG folders and TMPDIR.
#
# usage: sh tests/hostile-dom.sh
#   MD_OPEN  the script under test (default lib/md-view)
#   CHROME   the Chrome program (default: the macOS path, then google-chrome,
#            then chromium in PATH). A name with no slash is looked up in PATH.
#            A CHROME that is not executable skips all.
#
# Prints "ok <label>", "FAIL <label>" or "skip <label>". A row that needs the
# mermaid CDN prints "skip" when the CDN cannot be reached. With no Chrome it
# prints "skip all". Exit 0 when no row fails.

LC_ALL=C
export LC_ALL

here=$(cd "$(dirname -- "$0")" && pwd) || exit 1
root=$(cd "$here/.." && pwd) || exit 1
md_open=${MD_OPEN:-$root/lib/md-view}
case $md_open in
    /*) ;;
    *) md_open=$(pwd)/$md_open ;;
esac
fix=$here/fixtures
cdn=https://cdn.jsdelivr.net/npm/mermaid@12.3.0/dist/mermaid.min.js

CHROME=${CHROME:-}
if [ -z "$CHROME" ]; then
    for c in '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' google-chrome chromium; do
        case $c in
            /*)
                [ -x "$c" ] && { CHROME=$c; break; } ;;
            *)
                p=$(command -v "$c" 2>/dev/null) && [ -n "$p" ] && { CHROME=$p; break; } ;;
        esac
    done
fi
# A name with no slash is a command in PATH: resolve it, as the shell would.
case $CHROME in
    */*|'') ;;
    *) CHROME=$(command -v "$CHROME" 2>/dev/null) || CHROME= ;;
esac
if [ -z "$CHROME" ] || [ ! -x "$CHROME" ]; then
    echo "skip all"
    exit 0
fi

[ -f "$md_open" ] || { echo "FAIL setup: no script $md_open"; exit 1; }
# The vendored files (marked.min.js) are read from the folder of the script.
lib=$(cd "$(dirname -- "$md_open")" && pwd) || exit 1

net=1
curl -sfI --max-time 10 "$cdn" > /dev/null 2>&1 || net=0

tmp=$(mktemp -d "${TMPDIR:-/tmp}/md-view-hostile.XXXXXX") || exit 1
trap 'rm -rf "$tmp"' EXIT
trap 'exit 1' INT TERM HUP
tmp=$(cd "$tmp" && pwd) || exit 1

fails=0
cases=0

# fresh <n>: a new HOME, XDG folders and TMPDIR for case n, under $tmp. Sets d.
fresh() {
    d=$tmp/case$1
    mkdir -p "$d/home" "$d/config" "$d/cache" "$d/tmpdir" || return 1
    HOME=$d/home
    XDG_CONFIG_HOME=$d/config
    XDG_CACHE_HOME=$d/cache
    TMPDIR=$d/tmpdir
    export HOME XDG_CONFIG_HOME XDG_CACHE_HOME TMPDIR
    unset BROWSER MARKED_JS # each one changes what md-view runs or reads
}

# check <label> <command...>: runs the command as one case, in a subshell with a
# fresh environment. Prints ok or FAIL.
check() {
    label=$1
    shift
    cases=$((cases + 1))
    if (fresh "$cases" && "$@"); then
        echo "ok $label"
    else
        echo "FAIL $label"
        fails=$((fails + 1))
    fi
}

# net_check <label> <command...>: as check, but prints skip when the mermaid CDN
# cannot be reached.
net_check() {
    if [ "$net" = 1 ]; then
        check "$@"
    else
        echo "skip $1"
    fi
}

# absent <command...>: true when the command is false.
absent() { ! "$@"; }

# strip_scripts <dump>: the dumped DOM on one line, with every <script> element
# removed, so that only the rendered page is matched.
strip_scripts() {
    tr '\n' ' ' < "$1" | awk '{
        s = $0; out = ""
        while ((i = index(s, "<script")) > 0) {
            out = out substr(s, 1, i - 1)
            t = substr(s, i)
            j = index(t, "</script>")
            if (j == 0) { s = ""; break }
            s = substr(t, j + 9)
        }
        print out s
    }'
}

# mermaid_has_svg <dom>: the text between class="mermaid" and the next </pre>
# holds an <svg>.
mermaid_has_svg() {
    awk '{
        s = $0
        while ((i = index(s, "class=\"mermaid\"")) > 0) {
            t = substr(s, i)
            j = index(t, "</pre>")
            seg = (j > 0) ? substr(t, 1, j) : t
            if (index(seg, "<svg") > 0) found = 1
            s = substr(t, 2)
        }
        exit (found ? 0 : 1)
    }' "$1"
}

# render <page> <name>: headless Chrome dumps the page to $tmp/<name>.dom, and
# its log (console and CSP messages) goes to $tmp/<name>.err.
render() {
    prof=$(mktemp -d "$tmp/profile.XXXXXX") || return 1
    url=file://$(printf '%s' "$1" | sed 's/ /%20/g')
    "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
        --use-mock-keychain --password-store=basic \
        --user-data-dir="$prof" --enable-logging=stderr --virtual-time-budget=5000 \
        --dump-dom "$url" > "$tmp/$2.raw" 2> "$tmp/$2.err"
    st=$?
    strip_scripts "$tmp/$2.raw" > "$tmp/$2.dom"
    return $st
}

# render_proxy <page> <name> <port>: as render, but every request goes through a
# proxy on 127.0.0.1:<port>. With a silent listener the CDN script stalls; with
# no listener it is refused. The dump is taken after 2.5 s of real time, while
# the script still waits (--virtual-time-budget would not show a stall).
render_proxy() {
    prof=$(mktemp -d "$tmp/profile.XXXXXX") || return 1
    url=file://$(printf '%s' "$1" | sed 's/ /%20/g')
    "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
        --use-mock-keychain --password-store=basic \
        --user-data-dir="$prof" --timeout=2500 --proxy-server="http://127.0.0.1:$3" \
        --dump-dom "$url" > "$tmp/$2.raw" 2> "$tmp/$2.err"
    st=$?
    strip_scripts "$tmp/$2.raw" > "$tmp/$2.dom"
    return $st
}

# usage_fail <err-file> <args...>: md-view exits 2 with a usage line on stderr.
usage_fail() {
    err=$1
    shift
    sh "$md_open" "$@" > /dev/null 2> "$err"
    [ $? -eq 2 ] && grep -F -q 'usage:' "$err"
}

# one_cdn_script <page>: the pinned mermaid script is the only network address
# in the page. The page adds it with its integrity hash and CORS mode.
one_cdn_script() {
    [ "$(grep -F -o "$cdn" "$1" | wc -l | tr -d ' ')" = 1 ] &&
        grep -F -q "'sha384-HHW54r639fK42Ip0coGF3mz8oSiGn0eEoWNTLs75X7H63pLSDBa0Tqs0RwGmLlXE'" "$1" &&
        grep -F -q "s.crossOrigin = 'anonymous'" "$1" &&
        ! grep -E -q '<(script|link|img|iframe)[^>]*(src|href)=["'"'"']?https?:' "$1"
}

# inlined <page> <md>: the page holds the markdown text and marked in full.
inlined() {
    p=$(wc -c < "$1" | tr -d ' ')
    m=$(wc -c < "$2" | tr -d ' ')
    v=$(wc -c < "$lib/marked.min.js" | tr -d ' ')
    [ "$p" -ge $((m + v)) ]
}

# print_assoc <script>: the File associations entry of the script. The PATH is
# /usr/bin:/bin, so an md-view installed elsewhere is not found, and the entry
# names the script's own launcher path.
print_assoc() {
    env PATH=/usr/bin:/bin sh "$1" --print-association 2> /dev/null
}

# Row: the script is POSIX sh.
check "script: sh syntax" sh -n "$md_open"

# Row: plain page, --no-open, then the text, marked, mermaid init and network.
plain_page() {
    sh "$md_open" "$fix/plain.md" --out "$tmp/plain.html" --no-open > /dev/null 2> "$tmp/plain.err" &&
        [ -s "$tmp/plain.html" ]
}
check "plain: exit 0 and page written" plain_page
check "plain: markdown text in the page" grep -F -q '# Plain fixture' "$tmp/plain.html"
check "plain: marked inline" grep -F -q 'a markdown parser' "$tmp/plain.html"
check "plain: mermaid.initialize with securityLevel strict" grep -F -q "mermaid.initialize(" "$tmp/plain.html"
check "plain: securityLevel strict in the init call" grep -F -q "securityLevel: 'strict'" "$tmp/plain.html"
check "plain: marked and markdown text inlined in full" inlined "$tmp/plain.html" "$fix/plain.md"
check "plain: one CDN script for mermaid, pinned with integrity and CORS" one_cdn_script "$tmp/plain.html"
csp_policy() {
    grep -F -q 'http-equiv="Content-Security-Policy"' "$1" &&
        grep -F -q "default-src 'none'" "$1" &&
        grep -F -q "script-src 'unsafe-inline' https://cdn.jsdelivr.net" "$1" &&
        grep -F -q "img-src data: file:" "$1"
}
check "plain: content security policy allows only the script origin and local images" csp_policy "$tmp/plain.html"

# Row: the file's folder is the base href, with spaces encoded.
space_page() {
    mkdir -p "$tmp/with space" &&
        cp "$fix/plain.md" "$tmp/with space/plain file.md" &&
        sh "$md_open" "$tmp/with space/plain file.md" --out "$tmp/with space/out page.html" --no-open > /dev/null 2>&1 &&
        grep -F -q '# Plain fixture' "$tmp/with space/out page.html" &&
        grep -F -q 'with%20space/"' "$tmp/with space/out page.html"
}
check "paths with spaces: page written with a base href" space_page

# Row: an empty file renders an empty page.
empty_page() {
    : > "$tmp/empty.md" &&
        sh "$md_open" "$tmp/empty.md" --out "$tmp/empty.html" --no-open > /dev/null 2>&1 &&
        grep -F -q '<script type="text/markdown" id="md"' "$tmp/empty.html"
}
check "empty file: page written" empty_page

# Row: mermaid fence. The page renders in Chrome; the SVG needs the CDN.
diagram_page() {
    sh "$md_open" "$fix/diagram.md" --out "$tmp/diagram.html" --no-open > /dev/null 2>&1 &&
        render "$tmp/diagram.html" diagram
}
check "diagram: Chrome renders the page" diagram_page
net_check "diagram: svg inside the mermaid block (under the policy)" mermaid_has_svg "$tmp/diagram.dom"
check "diagram: heading text" grep -F -q 'Mermaid fixture' "$tmp/diagram.dom"

# Row: the CDN stalls. The text shows anyway, and the diagram source with it.
# The listener is local, so this row needs no network.
stall_page() {
    sh "$md_open" "$fix/diagram.md" --out "$tmp/stall.html" --no-open > /dev/null 2>&1 || return 1
    port=$((18000 + $$ % 2000))
    ( sleep 30 | nc -l 127.0.0.1 "$port" ) > /dev/null 2>&1 &
    lst=$!
    sleep 0.5
    render_proxy "$tmp/stall.html" stall "$port"
    st=$?
    pkill -P "$lst" 2> /dev/null
    kill "$lst" 2> /dev/null
    return $st
}
check "stalled CDN: Chrome renders the page" stall_page
check "stalled CDN: the heading shows" grep -F -q 'Mermaid fixture' "$tmp/stall.dom"
check "stalled CDN: the diagram source shows" grep -F -q 'Pitch and POC' "$tmp/stall.dom"

# Row: the CDN is refused. Each diagram shows as a code block.
refused_page() {
    sh "$md_open" "$fix/diagram.md" --out "$tmp/refused.html" --no-open > /dev/null 2>&1 &&
        render_proxy "$tmp/refused.html" refused 9
}
check "refused CDN: each diagram shows as a code block" refused_page
check "refused CDN: the code block holds the source" grep -F -q '<pre class="mermaid">flowchart LR' "$tmp/refused.dom"

# Row: </script> in the file does not end the script; the rest renders and
# nothing from the file runs or becomes an element.
hostile_page() {
    sh "$md_open" "$fix/hostile.md" --out "$tmp/hostile.html" --no-open > /dev/null 2>&1 &&
        render "$tmp/hostile.html" hostile
}
check "hostile: Chrome renders the page" hostile_page
check "hostile: text after </script> is shown" grep -F -q 'Still here' "$tmp/hostile.dom"
check "hostile: rest of the file is rendered" grep -F -q 'Last paragraph of the file.' "$tmp/hostile.dom"
check "hostile: no element with id x or pwned" absent grep -E -q '<[A-Za-z][^>]*[[:space:]]id="(x|pwned)"' "$tmp/hostile.dom"
check "hostile: no raw img element from the file" absent grep -F -q '<img' "$tmp/hostile.dom"

# Row: literal "<\/script>" and "<\!--" in the file come back as written.
escapes_page() {
    sh "$md_open" "$fix/escapes.md" --out "$tmp/escapes.html" --no-open > /dev/null 2>&1 &&
        render "$tmp/escapes.html" escapes
}
check "escapes: Chrome renders the page" escapes_page
check "escapes: literal <\\/script> in the text survives" grep -F -q '&lt;\/script&gt;' "$tmp/escapes.dom"
check "escapes: literal <\\!-- in the text survives" grep -F -q '&lt;\!--' "$tmp/escapes.dom"

# Row: a remote image in the file does not load (the policy blocks it).
remote_page() {
    sh "$md_open" "$fix/remote.md" --out "$tmp/remote.html" --no-open > /dev/null 2>&1 &&
        render "$tmp/remote.html" remote
}
check "remote image: Chrome renders the page" remote_page
check "remote image: the text after it shows" grep -F -q 'The text after the picture still shows.' "$tmp/remote.dom"
check "remote image: the policy refuses to load it" grep -F -q 'violates the following Content Security Policy directive: "img-src' "$tmp/remote.err"

# Row: a broken mermaid block shows its text and its error; a later one draws.
# The error and the drawn SVG come from mermaid, so these two rows need the CDN.
broken_page() {
    sh "$md_open" "$fix/broken-diagram.md" --out "$tmp/broken.html" --no-open > /dev/null 2>&1 &&
        render "$tmp/broken.html" broken
}
check "broken diagram: Chrome renders the page" broken_page
check "broken diagram: its source text shows" grep -F -q 'this is not a diagram' "$tmp/broken.dom"
net_check "broken diagram: the mermaid error shows in the block" grep -F -q 'class="mermaid-error"' "$tmp/broken.dom"
net_check "broken diagram: the next diagram still draws" mermaid_has_svg "$tmp/broken.dom"

# Row: a BOM and CRLF are accepted.
bom_page() {
    printf '\357\273\277# Bom head\r\n\r\ntext\r\n' > "$tmp/bom.md" &&
        sh "$md_open" "$tmp/bom.md" --out "$tmp/bom.html" --no-open > /dev/null 2>&1 &&
        render "$tmp/bom.html" bom &&
        grep -F -q '<h1 id="user-content-bom-head">Bom head</h1>' "$tmp/bom.dom"
}
check "BOM and CRLF: heading rendered" bom_page

# Row: no argument, missing file or unknown option: usage, exit 2, no page.
check "usage: no argument" usage_fail "$tmp/u1.err"
missing_case() {
    usage_fail "$tmp/u2.err" "$tmp/missing.md" --out "$tmp/missing.html" --no-open &&
        [ ! -e "$tmp/missing.html" ]
}
check "usage: missing file, no page written" missing_case
bogus_case() {
    usage_fail "$tmp/u3.err" "$fix/plain.md" --bogus --out "$tmp/bogus.html" --no-open &&
        [ ! -e "$tmp/bogus.html" ]
}
check "usage: unknown option, no page written" bogus_case

# Row: a file name that starts with "-" works after "--" (and with --out).
dash_name() {
    mkdir -p "$tmp/dash" && cp "$fix/plain.md" "$tmp/dash/-dash.md" &&
        (cd "$tmp/dash" && sh "$md_open" --out -dash.html --no-open -- -dash.md) > /dev/null 2> "$tmp/dash.err" &&
        [ ! -s "$tmp/dash.err" ] &&
        grep -F -q '<title>-dash.md</title>' "$tmp/dash/-dash.html" &&
        grep -F -q '# Plain fixture' "$tmp/dash/-dash.html"
}
check "leading dash after --: page written, no stderr" dash_name

# Row: without --no-open the page is written to the temporary folder and opened.
# The cache folder is a file here, so md-view cannot use it and writes the
# temporary page. A fake open on PATH records the page, so no window opens.
open_run() {
    mkdir -p "$d/fakebin" "$d/open dir" || return 1
    cat > "$d/fakebin/open" <<'EOF'
#!/bin/sh
printf '%s\n' "$1" > "$OPEN_LOG"
EOF
    chmod +x "$d/fakebin/open" && : > "$d/cache-file" || return 1
    PATH="$d/fakebin:$PATH" XDG_CACHE_HOME="$d/cache-file" TMPDIR="$d/open dir" \
        OPEN_LOG="$d/opened.txt" sh "$md_open" "$fix/plain.md" > /dev/null 2>&1 || return 1
    opened=$(cat "$d/opened.txt") || return 1
    case $opened in
        "$d/open dir"/md-view-*.html) [ -s "$opened" ] ;;
        *) return 1 ;;
    esac
}
check "open: temp page written and open runs on it" open_run

# Row: --print-association prints the entry. Its command is the launcher path,
# then !.!, and far2l escapes the file name in !.! itself, so it is not quoted.
assoc_run() {
    out=$(print_assoc "$md_open") || return 1
    printf '%s\n' "$out" | grep -F -q '*.md' &&
        printf '%s\n' "$out" | grep -F -q 'File associations' || return 1
    cmd=$(printf '%s\n' "$out" | sed -n 's/^  View command (used for Alt+F3): *//p')
    case $cmd in
        /*'!.!') ;;
        *) return 1 ;;
    esac
    exe=${cmd%' !.!'}
    [ -x "$exe" ] && [ "$(basename -- "$exe")" = md-view ]
}
check "association: entry with *.md and the Alt+F3 command, !.! unquoted" assoc_run

# far2l escapes a file name before the shell reads the Alt+F3 command
# (fnparce.cpp EscapeSpace, the QuotedSymbols default). The sed copies that step.
cat > "$tmp/far2l-escape.sed" <<'EOF'
s/[][ $&()`{};|*?!"'\\]/\\&/g
EOF

# Row: a hostile name runs no command. The name holds a command substitution;
# with the escape it is a plain name, so the marker file is never made.
assoc_name_run() {
    name='a "b" $(touch injected-marker) c.md'
    mkdir -p "$d/names" && printf '# Quoted name\n' > "$d/names/$name" || return 1
    cmd=$(print_assoc "$md_open" | sed -n 's/^  View command (used for Alt+F3): *//p') || return 1
    prefix=${cmd%'!.!'}
    [ "$prefix" != "$cmd" ] || return 1
    esc=$(printf '%s' "$name" | sed -f "$tmp/far2l-escape.sed") || return 1
    (cd "$d/names" && sh -c "$prefix$esc --out '$d/names.html' --no-open") > /dev/null 2>&1 || return 1
    [ ! -e "$d/names/injected-marker" ] || return 1
    grep -F -q '<title>a &quot;b&quot; $(touch injected-marker) c.md</title>' "$d/names.html"
}
check "association: the printed command opens a hostile name and runs no command in it" assoc_name_run

# Row: a script path with a space is quoted in the printed command.
assoc_space_run() {
    mkdir -p "$d/with space" && cp "$md_open" "$d/with space/md-view" || return 1
    out=$(print_assoc "$d/with space/md-view") || return 1
    printf '%s\n' "$out" | grep -F -q "\"$d/with space/md-view\" !.!"
}
check "association: a script path with a space is quoted" assoc_space_run

# Row: marked.min.js must not hold "</script", which would end the inline script.
check "marked: no </script in the vendored file" absent grep -F -q '</script' "$lib/marked.min.js"

if [ "$fails" -eq 0 ]; then
    echo "all checks pass"
    exit 0
fi
echo "$fails check(s) failed"
exit 1
