# Spec: md-view-script-hygiene

## `lib/md-view` internal functions and the source-only mode

After this story, the script exposes these functions to a shell that sources it with `MD_VIEW_SOURCE_ONLY=1`:

| Call | Result |
|---|---|
| `trim '  a b  '` | `trimmed` is `a b` (spaces and tabs at both ends removed) |
| `palette_ok github` / `palette_ok tokyo` | return 0; any other word returns 1 |
| `num_val 70 90` | `num=70`, return 0 |
| `num_val 99999999 90` | `num=90`, return 0 (no arithmetic on long input) |
| `num_val 0 90` | `num=` (empty), return 1 |
| `num_val 1x 90` | `num=` (empty), return 1 |
| `num_val '' 90` | `num=` (empty), return 1 |
| `browser_ok auto` / `browser_ok firefox` / `browser_ok chrome` / `browser_ok safari` | return 0 |
| `browser_ok /no/such/file` | return 1 |
| `browser_ok <existing executable file>` | return 0 |
| `browser_ok <existing dir without .app suffix>` | return 1 |
| `browser_ok <existing `.app` dir>` (Darwin only) | return 0 |
| `browser_ok notaword` | return 1 |
| `bake_ok 'a/b/c.md'` with `tree_depth=6` | return 0 |
| `bake_ok '.git/config'` | return 1 (a part starts with `.`) |
| `bake_ok 'a/node_modules/b.md'` | return 1 |
| `bake_ok 'a/<control-byte>b.md'` | return 1 |
| `bake_ok 'a/b/c/d/e/f/g/h.md'` with `tree_depth=6` | return 1 (depth exceeded) |
| `bake_ext_ok pic.PNG` / `bake_ext_ok pic.jpeg` | return 0 |
| `bake_ext_ok notes.md` | return 1 |
| `bake_link_chain 'a/b.md'` with `tree_root` set and no symlink below it | return 0 |
| `bake_link_chain 'link/b.md'` where `link` is a symlink below `tree_root` | return 1 |
| `url_escape 'a b'` | `a%20b` |
| `url_escape '%'` | `%25` |
| `url_escape "$(printf 'a\nb')"` | `a%0Ab` |
| `url_escape '<>&"?#'` | `%3C%3E%26%22%3F%23` |
| `enc_path 'a b'` | `a%20b` |
| `enc_path "$(printf 'x\n')"` | ends in `x%0A` (trailing newline kept) |
| `head_has_all L1 [L2 ...]` | return 0 iff every argument is a whole line of the head of `$page` (the lines up to and including the first `^</head>$` line). One read of the file, one awk pass, no per-line subprocess |

## Validation

| Call | Result |
|---|---|
| `MD_VIEW_SOURCE_ONLY=1 sh lib/md-view </dev/null` | exit 0, no output, no file written, no browser opened |
| `head_has_all` with no arguments | return 0 |
| `num_val` given a value with 6+ digits | clamps to the ceiling, no overflow |

## Done

`make check` exits 0, with the rows above covered by `tests/unit-helpers.sh` (new fifth test, run by `make check`) and by the existing integration suites. In addition: take a fixture whose parent path holds spaces, `%`, `#` and a trailing newline. The page written at `origin/main` and the page written after the story are byte-identical (`cmp` clean). So is the `<base href>` line.

## Out of scope

No change to any page byte, to the cache-reuse rules, to the vendored files, to `page.js`/`page.css`, to the spec, README or invariants. No fix for defects found through the new unit tests (report them instead). No `wc -c`, `bake_assets` or `ini_state` rework.
