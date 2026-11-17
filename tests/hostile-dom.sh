#!/bin/sh
# Hostile-input check of md-view in headless Chrome: escapes, raw HTML as text,
# blocked remote images, the source of a broken diagram, the CSP, the page
# written with --out, the File associations command with a hostile file name,
# and the mermaid diagrams on a tokyo page. Each row runs in a subshell with a
# fresh HOME, XDG folders and TMPDIR.
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

# mermaid_has <dom> <text>: the text between class="mermaid" and the next </pre>
# holds <text>.
mermaid_has() {
    awk -v want="$2" '{
        s = $0
        while ((i = index(s, "class=\"mermaid\"")) > 0) {
            t = substr(s, i)
            j = index(t, "</pre>")
            seg = (j > 0) ? substr(t, 1, j) : t
            if (index(seg, want) > 0) found = 1
            s = substr(t, 2)
        }
        exit (found ? 0 : 1)
    }' "$1"
}

# mermaid_has_svg <dom>: a diagram block holds an <svg>.
mermaid_has_svg() { mermaid_has "$1" '<svg'; }

# with_script <page> <out> <script>: writes <out> as <page> with <script> added
# before </body>, so it runs after the page script. <script> holds no backslash.
with_script() {
    awk -v s="$3" '{ i = index($0, "</body>"); if (i) print substr($0, 1, i - 1) s substr($0, i); else print }' "$1" > "$2"
}

# render <page> <name> [<window>] [<ms>]: headless Chrome dumps the page to
# $tmp/<name>.dom, and its log (console and CSP messages) goes to
# $tmp/<name>.err. <window> is a size such as 600,800, for the window size of
# Chrome. <ms> is the virtual time budget (5000 ms by default); the accent rows
# give a longer one, because their script polls with setTimeout from the bar to
# the draw and to the redraws.
render() {
    prof=$(mktemp -d "$tmp/profile.XXXXXX") || return 1
    url=file://$(printf '%s' "$1" | sed 's/ /%20/g')
    "$CHROME" --headless=new --disable-gpu --no-first-run --no-default-browser-check \
        --use-mock-keychain --password-store=basic \
        --user-data-dir="$prof" --enable-logging=stderr --virtual-time-budget=${4:-5000} \
        ${3:+--window-size=$3} --dump-dom "$url" > "$tmp/$2.raw" 2> "$tmp/$2.err"
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

# The accents are inline styles on the shapes of a drawn svg. With the CDN
# refused the block keeps its source and has no svg, so no accent shows. The
# page style holds no stroke property, so any stroke in the dump is an accent.
check "refused CDN: the code block shows no accent paint" absent grep -F -q 'stroke' "$tmp/refused.dom"

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

# Rows: a tokyo page. The diagrams draw in both modes, with the colors of the
# palette (the bg-hl of Tokyo Night and of Tokyo Day), and the init call keeps
# securityLevel strict. The colors and the init call come from mermaid, so these
# rows need the CDN.
# palette_page <name> <script|-> <args...>: diagram.md as a page with <args>, and
# <script> added before </body> unless it is "-". The DOM goes to $tmp/<name>.dom.
palette_page() {
    n=$1
    js=$2
    shift 2
    sh "$md_open" "$fix/diagram.md" "$@" --out "$tmp/$n.html" --no-open > /dev/null 2>&1 || return 1
    if [ "$js" != - ]; then
        with_script "$tmp/$n.html" "$tmp/$n.html.js" "<script>$js</script>" &&
            mv "$tmp/$n.html.js" "$tmp/$n.html" || return 1
    fi
    render "$tmp/$n.html" "$n"
}
# A script is WHEN_DRAWN, some code and WHEN_DRAWN_END. It runs the code when the
# first diagram has its svg.
WHEN_DRAWN="(function w(){var p=document.querySelector('pre.mermaid');if(p&&p.querySelector('svg')){"
WHEN_DRAWN_END="}else setTimeout(w,50);})();"
tokyo_strict() {
    palette_page tokyo-strict "${WHEN_DRAWN}document.title='level='+mermaid.mermaidAPI.getConfig().securityLevel;$WHEN_DRAWN_END" --palette tokyo --theme dark &&
        grep -F -q '<title>level=strict</title>' "$tmp/tokyo-strict.dom" &&
        one_cdn_script "$tmp/tokyo-strict.html"
}
tokyo_draws() {
    palette_page "tokyo-$1" - --palette tokyo --theme "$1" &&
        mermaid_has_svg "$tmp/tokyo-$1.dom" &&
        mermaid_has "$tmp/tokyo-$1.dom" "$2"
}
net_check "palette: tokyo strict" tokyo_strict
net_check "palette: tokyo dark draws svg" tokyo_draws dark '#292e42'
net_check "palette: tokyo light draws svg" tokyo_draws light '#c4c8da'

# Row: a github dark page with a diagram. The key s changes the palette to tokyo
# once the diagram has drawn, and the diagram then draws again in the colors of
# Tokyo Night. The same page without the key keeps the github colors.
redraw_pages() {
    palette_page redraw-key "${WHEN_DRAWN}document.dispatchEvent(new KeyboardEvent('keydown',{key:'s'}));$WHEN_DRAWN_END" --palette github --theme dark &&
        palette_page redraw-still - --palette github --theme dark
}
redraw_check() {
    redraw_pages &&
        mermaid_has "$tmp/redraw-key.dom" '#292e42' &&
        mermaid_has_svg "$tmp/redraw-still.dom" &&
        ! mermaid_has "$tmp/redraw-still.dom" '#292e42'
}
net_check "palette: mermaid redraw" redraw_check

# Rows: the diagram viewer, on broken-diagram.md (one failed block, one drawn
# diagram). A script is WHEN_BAR, some code and WHEN_BAR_END. It runs the code
# when the first bar is in the page: the bar comes after the viewBox is read, so
# WHEN_BAR is used here and not WHEN_DRAWN.
WHEN_BAR="(function w(){if(document.querySelector('.md-dbar')){"
WHEN_BAR_END="}else setTimeout(w,50);})();"
# WHEN_PAINT is an accent on the shape of the first node: the page writes it
# as an inline style, and the theme border of a node is not, so an inline
# stroke means the accent pass has run on this svg. It polls at 0 ms, so a
# slow CDN fetch costs virtual time only when the page is idle.
WHEN_PAINT="(function w(){var q=document.querySelector('pre.mermaid svg g.node rect');if(q&&q.style.stroke){"
WHEN_PAINT_END="}else setTimeout(w,0);})();"

# Rows: the accent paint of a drawn diagram. The pages use the default github
# palette, so an accent is one of the 16 hexes of GITHUB_ACCENTS (the 8 keys of
# the cycle, once per mode). The rows read the inline style of a shape, not the
# computed style, and they run on the bar (WHEN_BAR): the page adds the bar and
# paints the accents in the same step.
# accent_page <name> <fixture> <script|-> <args...>: <fixture> as a page with
# <args>, and <script> added before </body> unless it is "-". Chrome dumps the
# page to $tmp/<name>.dom.
accent_page() {
    n=$1
    f=$2
    js=$3
    shift 3
    sh "$md_open" "$fix/$f" "$@" --out "$tmp/$n.html" --no-open > /dev/null 2>&1 || return 1
    if [ "$js" != - ]; then
        with_script "$tmp/$n.html" "$tmp/$n.html.js" "<script>$js</script>" &&
            mv "$tmp/$n.html.js" "$tmp/$n.html" || return 1
    fi
    render "$tmp/$n.html" "$n" "" 15000
}
# ACCENT_LIB is the page-side code of these rows. ACC holds the github accents:
# the 8 light hexes, then the 8 dark ones. norm drops the spaces of a color, as
# the DOM writes it. isAccent is true for a color of ACC, in the hex form or in
# the rgb form. shape is the shape child the page paints, not the label. keyOf
# is the node key: the id with the mermaid flowchart prefix and the trailing
# -<n> dropped, as the redraw rows read it. strokeOf is the inline
# stroke of a node shape. center and box give the node center from its own
# translate and the box of a cluster from its rect attributes. clusterOf is the
# cluster of a node: the innermost box that holds the center, the smallest
# width * height, a tie keeping the later cluster. srcKey is the source key of a
# connector: drop the leading L_ and the trailing _<n>, then keep the longest
# node key that starts the rest and ends at a _ boundary. These follow the rules
# of the page script.
ACCENT_LIB="var ACC='#0969da #1b7c83 #1a7f37 #8250df #bc4c00 #cf222e #6639ba #9a6700 #4493f8 #33b5c9 #3fb950 #a56eff #db6d28 #ff7b72 #ab7df6 #d4a72c';var norm=function(c){c=(c||'').toLowerCase();var o='';for(var i=0;i<c.length;i++){var ch=c.charAt(i);if(ch!==' ')o+=ch;}return o};var hexrgb=function(h){return 'rgb('+parseInt(h.substr(1,2),16)+','+parseInt(h.substr(3,2),16)+','+parseInt(h.substr(5,2),16)+')'};var isAccent=function(c){var L=ACC.split(' ');var v=norm(c);for(var i=0;i<L.length;i++){if(v===L[i]||v===hexrgb(L[i]))return 1;}return 0};var shape=function(g){var t=['rect','polygon','circle','ellipse','path'];for(var i=0;i<t.length;i++){var q=g.querySelector(':scope > '+t[i]);if(q)return q;}return null};var keyOf=function(n){var id=n.id||'';return id.replace(/^.*flowchart-/,'').replace(/-[0-9]+$/,'')};var strokeOf=function(n){var q=shape(n);return q?norm(q.style.stroke):''};var nums=function(t){var o=[],cur='';for(var i=0;i<t.length;i++){var ch=t.charAt(i);if((ch>='0'&&ch<='9')||ch==='-'||ch==='.'){cur+=ch;}else if(cur){o.push(parseFloat(cur));cur='';}}if(cur)o.push(parseFloat(cur));return o};var center=function(n){var t=n.getAttribute('transform')||'';var k=t.indexOf('translate(');if(k<0)return null;var a=nums(t.slice(k));return a.length>1?{x:a[0],y:a[1]}:null};var box=function(c){var r=c.querySelector('rect');return {x:parseFloat(r.getAttribute('x')),y:parseFloat(r.getAttribute('y')),w:parseFloat(r.getAttribute('width')),h:parseFloat(r.getAttribute('height'))}};var clusterOf=function(cl,n){var c=center(n);if(!c)return -1;var best=-1,area=Infinity;for(var i=0;i<cl.length;i++){var b=box(cl[i]);if(isNaN(b.x)||isNaN(b.y)||isNaN(b.w)||isNaN(b.h))continue;if(c.x<b.x||c.x>b.x+b.w||c.y<b.y||c.y>b.y+b.h)continue;if(b.w*b.h<=area){best=i;area=b.w*b.h;}}return best};var srcKey=function(id,keys){if(!id||id.indexOf('L_')!==0)return '';var rest=id.slice(2,id.lastIndexOf('_'));var best='';for(var k in keys){if(k.length>best.length&&rest.length>k.length&&rest.indexOf(k)===0&&rest.charAt(k.length)==='_')best=k;}return best};"
# linksOk <svg> <keys> <by>: every connector is in one of the two states of the
# paint: it carries the stroke of the source node its data-id names, 2 px wide,
# or it keeps the theme stroke and has no inline stroke of its own. A connector
# with an inline stroke of another color fails the row. painted and theme count
# the two states, and the row puts both in its title.
ACCENT_LINKS="var linksOk=function(s,keys,by){var L=s.querySelectorAll('path.flowchart-link');var painted=0,theme=0;for(var i=0;i<L.length;i++){var v=norm(L[i].style.stroke);if(v===''){theme++;}else{var k=srcKey(L[i].getAttribute('data-id'),keys);if(k===''||v!==by[k]||L[i].style.strokeWidth!=='2px')return 0;painted++;}}return painted+theme===L.length&&L.length?1:0};"
# A flat diagram (no subgraph) colors each node by its place in document order,
# so the first two nodes differ, and both take an accent of the palette. The
# first node carries the four properties of the paint: the accent as fill and as
# stroke, blended at 0.15, 2 px wide. Every connector agrees with its source: a
# source the node keys name gives it the stroke of that node, and one they do
# not name keeps the theme stroke. The title is the flag, then the counts of
# nodes, of connectors, of painted connectors, and of connectors on the theme.
accent_flat_page() {
    accent_page accent-flat diagram.md "${WHEN_PAINT}${ACCENT_LIB}${ACCENT_LINKS}var s=document.querySelector('pre.mermaid svg');var ns=s.querySelectorAll('g.node');var keys={},by={},i;for(i=0;i<ns.length;i++){var k=keyOf(ns[i]);keys[k]=1;by[k]=strokeOf(ns[i]);}var q=shape(ns[0]);var L=s.querySelectorAll('path.flowchart-link'),painted=0,theme=0;for(i=0;i<L.length;i++){if(norm(L[i].style.stroke)==='')theme++;else painted++;}document.title='flat='+(isAccent(strokeOf(ns[0]))&&isAccent(strokeOf(ns[1]))&&strokeOf(ns[0])!==strokeOf(ns[1])&&ns.length>1&&linksOk(s,keys,by)&&q.style.stroke===q.style.fill&&q.style.fillOpacity==='0.15'&&q.style.strokeWidth==='2px'?1:0)+' nodes='+ns.length+' links='+L.length+' painted='+painted+' theme='+theme;$WHEN_PAINT_END" &&
        grep -F -q '<title>flat=1 nodes=6 links=6 painted=6 theme=0</title>' "$tmp/accent-flat.dom"
}
net_check "accent: a flat diagram colors each node and its connectors" accent_flat_page
# A diagram with three subgraphs gives every node of one subgraph the stroke of
# that subgraph, and two subgraphs differ. The nodes come in the order of the
# fixture: the two of alpha, the two of beta, the three of gamma. The box of a
# subgraph is an accent of the palette, not the theme border, blended at 0.06 and
# 2 px wide, and it holds the stroke of the nodes inside it. Every connector
# carries the stroke of the node it starts from, so none of them keeps the theme
# stroke. The title is the flag, then the counts of nodes, of clusters, and of
# connectors on the theme stroke.
accent_cluster_page() {
    accent_page accent-cluster accent-subgraphs.md "${WHEN_PAINT}${ACCENT_LIB}var s=document.querySelector('pre.mermaid svg');var ns=s.querySelectorAll('g.node'),i;var st=function(j){return strokeOf(ns[j])};var same=function(a,b){return st(a)&&st(a)===st(b)?1:0};var cl=s.querySelectorAll('g.cluster');var cr=function(g){return norm(g.querySelector('rect').style.stroke)};var boxOk=function(g){var r=g.querySelector('rect');return isAccent(cr(g))&&r.style.fillOpacity==='0.06'&&r.style.strokeWidth==='2px'?1:0};var pair=function(){for(var j=0;j<ns.length;j++){var ci=clusterOf(cl,ns[j]);if(ci<0||strokeOf(ns[j])!==cr(cl[ci]))return 0;}return 1};var L=s.querySelectorAll('path.flowchart-link'),theme=0;for(i=0;i<L.length;i++)if(norm(L[i].style.stroke)==='')theme++;document.title='cluster='+(same(0,1)&&same(2,3)&&same(4,5)&&same(5,6)&&st(0)!==st(2)&&st(2)!==st(4)&&cl.length===3&&boxOk(cl[0])&&boxOk(cl[1])&&boxOk(cl[2])&&cr(cl[0])!==cr(cl[1])&&cr(cl[1])!==cr(cl[2])&&pair()&&theme===0?1:0)+' nodes='+ns.length+' clusters='+cl.length+' theme='+theme;$WHEN_PAINT_END" &&
        grep -F -q '<title>cluster=1 nodes=7 clusters=3 theme=0</title>' "$tmp/accent-cluster.dom"
}
net_check "accent: each subgraph shares a hue, and its box keeps that hue" accent_cluster_page
# The broken block shows its source, so it holds no svg and no accent at all; the
# block after it draws, and its two nodes take two accents of the palette. The
# title is the flag, then the count of painted elements in the source block and
# the count of nodes in the drawn one.
accent_broken_page() {
    accent_page accent-broken broken-diagram.md "${WHEN_PAINT}${ACCENT_LIB}var b=document.querySelector('code.language-mermaid').parentNode;var all=b.querySelectorAll('*'),painted=0,i;for(i=0;i<all.length;i++)if(all[i].style.stroke)painted++;var ns=document.querySelector('pre.mermaid').querySelectorAll('g.node');document.title='broken='+(b.querySelector('svg')===null&&b.querySelector('.mermaid-error')&&painted===0&&ns.length===2&&isAccent(strokeOf(ns[0]))&&isAccent(strokeOf(ns[1]))&&strokeOf(ns[0])!==strokeOf(ns[1])?1:0)+' painted='+painted+' nodes='+ns.length;$WHEN_PAINT_END" &&
        grep -F -q '<title>broken=1 painted=0 nodes=2</title>' "$tmp/accent-broken.dom"
}
net_check "accent: a source-only block shows no accent, a drawn one does" accent_broken_page
# The page starts on github dark. The key s changes the palette to tokyo, and the
# two presses of the key t take the theme from dark to auto and to light: each
# change draws the diagram again and paints the accents of the new colors. The
# row waits for the new svg of each redraw, and asks that every node shape holds
# an inline stroke 2 px wide, and that every connector agrees with its source. The
# first flag says the first node changed its stroke when the palette changed,
# because the accents of tokyo dark differ from those of github dark. The next two
# say the paint is there after the palette change and after the theme change.
accent_redraw_page() {
    accent_page accent-redraw diagram.md "${WHEN_PAINT}${ACCENT_LIB}${ACCENT_LINKS}var p=document.querySelector('pre.mermaid');var s0=p.querySelector('svg');var one=function(){var s=p.querySelector('svg');var ns=s&&s.querySelectorAll('g.node');return ns&&ns.length?strokeOf(ns[0]):'';};var stat=function(){var s=p.querySelector('svg');if(!s)return 0;var ns=s.querySelectorAll('g.node');if(!ns.length)return 0;var keys={},by={},i;for(i=0;i<ns.length;i++){var k=keyOf(ns[i]);var q=shape(ns[i]);if(!q||!q.style.stroke||q.style.strokeWidth!=='2px')return 0;keys[k]=1;by[k]=norm(q.style.stroke);}return linksOk(s,keys,by);};var tries=0;var before=one();document.dispatchEvent(new KeyboardEvent('keydown',{key:'s'}));var w1=function(){var s1=p.querySelector('svg');if(!(s1&&s1!==s0&&stat())){if(tries++<3000)setTimeout(w1,0);return;}document.title='redraw=s='+(before!==''&&before!==one()?1:0)+' paint='+stat();document.dispatchEvent(new KeyboardEvent('keydown',{key:'t'}));document.dispatchEvent(new KeyboardEvent('keydown',{key:'t'}));var base=s1;tries=0;var w2=function(){var s2=p.querySelector('svg');if(s2&&s2!==base&&stat()){document.title+=' theme=1';}else if(tries++<3000)setTimeout(w2,0);};setTimeout(w2,0);};w1();$WHEN_PAINT_END" --palette github --theme dark &&
        grep -F -q '<title>redraw=s=1 paint=1 theme=1</title>' "$tmp/accent-redraw.dom"
}
net_check "accent: a palette change and a theme change recolor the diagram" accent_redraw_page

# viewer_html <name> <script|-> <args...>: broken-diagram.md as a page with <args>,
# and <script> added before </body> unless it is "-". The page is $tmp/<name>.html.
viewer_html() {
    n=$1
    js=$2
    shift 2
    sh "$md_open" "$fix/broken-diagram.md" "$@" --out "$tmp/$n.html" --no-open > /dev/null 2>&1 || return 1
    if [ "$js" != - ]; then
        with_script "$tmp/$n.html" "$tmp/$n.html.js" "<script>$js</script>" &&
            mv "$tmp/$n.html.js" "$tmp/$n.html" || return 1
    fi
}
# viewer_page <name> <script|-> <args...>: viewer_html, then Chrome dumps the page
# to $tmp/<name>.dom.
viewer_page() {
    viewer_html "$@" && render "$tmp/$1.html" "$1"
}
bars_page() {
    viewer_page bars "${WHEN_BAR}document.title='bars='+document.querySelectorAll('.md-dbar').length+' failed='+document.querySelector('.mermaid-error').parentNode.querySelectorAll('.md-dbar').length;$WHEN_BAR_END" &&
        grep -F -q '<title>bars=1 failed=0</title>' "$tmp/bars.dom"
}
net_check "viewer: one bar on the drawn diagram" bars_page
fit_page() {
    viewer_page fit "${WHEN_BAR}document.querySelector('.md-dbar button').click();var d=document.querySelector('dialog');var s=d.querySelector('svg');var box=d.querySelector('.md-vbox');var r=s.getBoundingClientRect();var w0=s.viewBox.baseVal.width;var h0=s.viewBox.baseVal.height;var k=Math.min(box.clientWidth/w0,box.clientHeight/h0);document.title='open='+(d.open?1:0)+' modal='+(d.matches(':modal')?1:0)+' moved='+(document.querySelector('pre svg')?0:1)+' one='+(document.querySelectorAll('svg').length===1&&document.getElementById(s.id)===s?1:0)+' fit='+(r.width<=box.clientWidth&&r.height<=box.clientHeight?1:0)+' largest='+(Math.abs(r.width-w0*k)<1&&Math.abs(r.height-h0*k)<1?1:0)+' bar='+(innerWidth>document.documentElement.clientWidth?1:0)+' edge='+(d.getBoundingClientRect().right<=document.documentElement.clientWidth?1:0);$WHEN_BAR_END" &&
        grep -F -q '<title>open=1 modal=1 moved=1 one=1 fit=1 largest=1 ' "$tmp/fit.dom" &&
        render "$tmp/fit.html" fit-low 1600,240 &&
        grep -F -q '<title>open=1 modal=1 moved=1 one=1 fit=1 largest=1 bar=1 edge=1</title>' "$tmp/fit-low.dom"
}
# The Fit row runs also in a low window, where the height limits the zoom and the
# page has a scroll bar. The dialog must stay clear of that scroll bar (edge).
net_check "viewer: Expand opens the dialog in Fit" fit_page
close_page() {
    viewer_page close "${WHEN_BAR}var p=document.querySelector('pre.mermaid');var s=p.querySelector('svg');var before=s.getAttribute('style');document.querySelector('.md-dbar button').click();var d=document.querySelector('dialog');d.querySelector('button[aria-label=Close]').click();document.title='closed='+(d.open?0:1)+' back='+(p.contains(s)?1:0)+' style='+(s.getAttribute('style')===before?1:0);setTimeout(function(){document.querySelector('.md-dbar button').click();d.close();d.dispatchEvent(new Event('close'));setTimeout(function(){document.title+=' dclose='+(d.open?0:1)+' back='+(p.contains(s)?1:0)+' style='+(s.getAttribute('style')===before?1:0);},100);},100);$WHEN_BAR_END" &&
        grep -F -q '<title>closed=1 back=1 style=1 dclose=1 back=1 style=1</title>' "$tmp/close.dom"
}
# The second step calls dialog.close() and then sends the close event, so the page
# listener runs. In the headless dump, Chrome's own close event does not reach the
# page, so the step sends it. The result is read after a timer.
net_check "viewer: close puts the svg back" close_page
click_page() {
    viewer_page click "${WHEN_BAR}var g=document.querySelector('pre.mermaid svg').querySelector('g');var d=function(){var x=document.querySelector('dialog');return x&&x.open?1:0};getSelection().selectAllChildren(document.querySelector('h1'));g.dispatchEvent(new MouseEvent('click',{bubbles:true}));var sel=d();getSelection().removeAllRanges();g.dispatchEvent(new MouseEvent('click',{bubbles:true}));document.title='selected='+sel+' plain='+d();$WHEN_BAR_END" &&
        grep -F -q '<title>selected=0 plain=1</title>' "$tmp/click.dom"
}
net_check "viewer: a click on the diagram opens it" click_page
narrow_page() {
    viewer_html narrow "${WHEN_BAR}document.querySelector('.md-dbar button').click();document.title='open='+(document.querySelector('dialog').open?1:0)+' narrow='+(innerWidth<700?1:0)+' shown='+(getComputedStyle(document.querySelector('.md-dbar')).display!=='none'?1:0);$WHEN_BAR_END" &&
        render "$tmp/narrow.html" narrow 600,800 &&
        grep -F -q '<title>open=1 narrow=1 shown=1</title>' "$tmp/narrow.dom"
}
net_check "viewer: opens in a 600 px window" narrow_page
# The print rule is text, so this row reads the two @media print lines. It needs
# no browser.
print_bar() {
    sh "$md_open" "$fix/broken-diagram.md" --tree off --out "$tmp/print-off.html" --no-open > /dev/null 2>&1 &&
        sh "$md_open" "$fix/broken-diagram.md" --tree on --out "$tmp/print-on.html" --no-open > /dev/null 2>&1 &&
        grep '^@media print' "$tmp/print-off.html" | grep -F -q '.md-dbar' &&
        grep '^@media print' "$tmp/print-on.html" | grep -F -q '.md-dbar'
}
check "viewer: print hides the bar" print_bar
# The zoom row reads the rendered width after each step. The first flag is the
# focus at open: it is on Close, so Enter does not zoom out. Then: 1, +, -, the +
# button, a wheel of deltaY 100 at the box center, the - button and 1:1. Fit and 0
# each start from an svg larger than the box. The expected width is w0 times the
# Fit zoom of the box as it is when the key or button is pressed. The title is the
# ten flags in that order.
zoom_page() {
    viewer_page zoom "${WHEN_BAR}document.querySelector('.md-dbar button').click();var d=document.querySelector('dialog');var s=d.querySelector('svg');var box=d.querySelector('.md-vbox');var w0=s.viewBox.baseVal.width;var h0=s.viewBox.baseVal.height;var r=[];var key=function(k){d.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}))};var btn=function(l){return [].filter.call(d.querySelectorAll('button'),function(x){return x.getAttribute('aria-label')===l})[0]};var at=function(a){return Math.abs(s.getBoundingClientRect().width-a)<0.5?1:0};var fit=function(){return w0*Math.min(box.clientWidth/w0,box.clientHeight/h0)};var big=function(){for(var i=0;i<20&&s.getBoundingClientRect().width<=box.clientWidth;i++)key('+')};r.push(document.activeElement&&document.activeElement.getAttribute('aria-label')==='Close'?1:0);key('1');r.push(at(w0));key('+');r.push(at(w0*1.25));key('-');r.push(at(w0));btn('Zoom in').click();r.push(at(w0*1.25));var c=box.getBoundingClientRect();box.dispatchEvent(new WheelEvent('wheel',{deltaY:100,clientX:c.left+c.width/2,clientY:c.top+c.height/2,bubbles:true,cancelable:true}));r.push(at(w0));btn('Zoom out').click();r.push(at(w0/1.25));btn('Actual size').click();r.push(at(w0));big();var f=fit();btn('Fit').click();r.push(at(f));big();var g=fit();key('0');r.push(at(g));document.title='zoom='+r.join('');$WHEN_BAR_END" &&
        grep -F -q '<title>zoom=1111111111</title>' "$tmp/zoom.dom"
}
net_check "viewer: zoom keys, buttons and wheel" zoom_page
# The drag row: a drag pans the box by the pointer move, and a drag that starts on
# the scroll bar does not pan. The box has user-select none. The title is the four
# flags in that order: the pan, the scroll bars are there, no pan on the scroll bar,
# user-select none.
drag_page() {
    viewer_page drag "${WHEN_BAR}document.querySelector('.md-dbar button').click();var d=document.querySelector('dialog');var box=d.querySelector('.md-vbox');var b=box.getBoundingClientRect();var pe=function(t,x,y){box.dispatchEvent(new PointerEvent(t,{pointerId:1,button:0,buttons:1,pointerType:'mouse',clientX:x,clientY:y,bubbles:true}))};var key=function(k){d.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true}))};for(var i=0;i<20&&(box.scrollWidth<=box.clientWidth+100||box.scrollHeight<=box.clientHeight+100);i++)key('+');box.scrollLeft=100;box.scrollTop=100;var sl=box.scrollLeft;var st=box.scrollTop;var r=[];pe('pointerdown',b.left+200,b.top+150);pe('pointermove',b.left+180,b.top+130);pe('pointerup',b.left+180,b.top+130);r.push(Math.abs(box.scrollLeft-sl-20)<0.5&&Math.abs(box.scrollTop-st-20)<0.5?1:0);r.push(box.offsetWidth>box.clientWidth&&box.offsetHeight>box.clientHeight?1:0);sl=box.scrollLeft;st=box.scrollTop;pe('pointerdown',b.left+box.clientWidth+5,b.top+150);pe('pointermove',b.left+box.clientWidth-15,b.top+130);pe('pointerup',b.left+box.clientWidth-15,b.top+130);r.push(box.scrollLeft===sl&&box.scrollTop===st?1:0);var cs=getComputedStyle(box);r.push(cs.userSelect==='none'||cs.webkitUserSelect==='none'?1:0);document.title='drag='+r.join('');$WHEN_BAR_END" &&
        grep -F -q '<title>drag=1111</title>' "$tmp/drag.dom"
}
net_check "viewer: a drag pans, and the scroll bar does not" drag_page
# The page keys t and w are sent to the open dialog. The theme and the width do not change.
keys_page() {
    viewer_page keys "${WHEN_BAR}document.querySelector('.md-dbar button').click();var d=document.querySelector('dialog');var h=document.documentElement;var before=h.getAttribute('data-theme')+h.getAttribute('data-width');d.dispatchEvent(new KeyboardEvent('keydown',{key:'t',bubbles:true}));d.dispatchEvent(new KeyboardEvent('keydown',{key:'w',bubbles:true}));document.title='open='+(d.open?1:0)+' keys='+(before===h.getAttribute('data-theme')+h.getAttribute('data-width')?'still':'changed');$WHEN_BAR_END" &&
        grep -F -q '<title>open=1 keys=still</title>' "$tmp/keys.dom"
}
net_check "viewer: page keys do nothing while open" keys_page
# A palette change while the viewer is open closes it, and the diagram draws again
# in the new palette. The popover is hidden, so the script clicks its tokyo button.
# The title is four flags: the viewer was open, it is closed, the dialog holds no
# svg, and the page holds one svg.
palette_close_page() {
    viewer_page palette-close "${WHEN_BAR}var old=document.querySelector('.md-dbar');document.querySelector('.md-dbar button').click();var d=document.querySelector('dialog');var opened=d.open?1:0;[].filter.call(document.querySelectorAll('#md-pop button'),function(x){return x.textContent==='tokyo'})[0].click();var wait=function(){var b=document.querySelector('.md-dbar');var p=document.querySelector('pre.mermaid');if(b&&b!==old&&p&&p.innerHTML.indexOf('#292e42')>=0){document.title='opened='+opened+' closed='+(d.open?0:1)+' dialogSvgs='+d.querySelectorAll('svg').length+' svgs='+document.querySelectorAll('svg').length;}else setTimeout(wait,50);};wait();$WHEN_BAR_END" --theme dark &&
        grep -F -q '<title>opened=1 closed=1 dialogSvgs=0 svgs=1</title>' "$tmp/palette-close.dom"
}
net_check "viewer: a palette change closes the viewer" palette_close_page

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
