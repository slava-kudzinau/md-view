#!/bin/sh
# tests/bench.sh [SCRIPT]: times md-view on a tree of 3000 files. It builds the
# tree in a temporary folder, runs SCRIPT (default lib/md-view of this checkout)
# on its index.md two times, and prints the time of a new page and of a cached
# page. It is not part of make check: it measures, it does not check. A failed
# run or a stderr line from a clean run fails the bench.

set -u

root=$(cd "$(dirname "$0")/.." && pwd) || exit 1
script=${1:-$root/lib/md-view}
[ -f "$script" ] || { echo "bench: no script $script" >&2; exit 2; }

tmp=$(mktemp -d "${TMPDIR:-/tmp}/md-view-bench.XXXXXX") || exit 1
trap 'rm -rf "$tmp"' EXIT
tree=$tmp/tree
mkdir -p "$tree" "$tmp/home" "$tmp/config" "$tmp/cache" || exit 1
export HOME=$tmp/home XDG_CONFIG_HOME=$tmp/config XDG_CACHE_HOME=$tmp/cache

# File i (0 to 2999) is d<i%10>/d<i%100>/d<i%1000>/f<i>.md, with 100 + (i * 7919)
# % 20000 bytes of text lines (80 bytes each, the last one shorter). The root
# holds index.md and n0.txt to n9.txt. No random numbers.
TREE=$tree awk '
BEGIN {
    tree = ENVIRON["TREE"]
    printf "# Index\n\nBench tree.\n" > (tree "/index.md")
    close(tree "/index.md")
    for (k = 0; k < 10; k++) {
        printf "text %d\n", k > (tree "/n" k ".txt")
        close(tree "/n" k ".txt")
    }
    row = sprintf("%79s", "")
    gsub(/ /, "x", row)
    for (i = 0; i < 3000; i++) {
        dir = tree "/d" (i % 10) "/d" (i % 100) "/d" (i % 1000)
        if (!(dir in made)) {
            made[dir] = 1
            system("mkdir -p \"" dir "\"")
        }
        size = 100 + (i * 7919) % 20000
        f = dir "/f" i ".md"
        for (b = 0; b < size; b += 80) {
            n = size - b
            if (n > 80) n = 80
            printf "%s\n", substr(row, 1, n - 1) > f
        }
        close(f)
    }
}' || { echo "bench: cannot make the tree" >&2; exit 1; }

index=$tree/index.md
t=$tmp/time.txt

# timed LABEL: runs the script on index.md with time -p. It prints LABEL and the
# real time in seconds. A nonzero exit, or any stderr line that is not a time
# line, fails the bench.
timed() {
    command time -p sh "$script" --no-open "$index" 2> "$t" ||
        { cat "$t" >&2; echo "bench: $1 run failed" >&2; exit 1; }
    if grep -qEv '^(real|user|sys) ' "$t"; then
        cat "$t" >&2
        echo "bench: $1 run wrote to stderr" >&2
        exit 1
    fi
    sec=$(awk '$1 == "real" { print $2 }' "$t")
    [ -n "$sec" ] || { echo "bench: no real time for $1" >&2; exit 1; }
    echo "$1: $sec s"
}

timed 'new page'
timed 'cached page'
