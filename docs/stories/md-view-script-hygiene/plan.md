# Plan: md-view-script-hygiene

Spec: `spec.md` (governs exact values). No design doc; the plan carries the design.

## Global Constraints

- POSIX `sh` only. Add no new tool, package or dependency. Tests are POSIX `sh` like the existing four.
- No change to any page byte: not the head lines, the Markdown body escaping, the vendored-file inlining or the cache-reuse key format. A written page after the change is byte-identical to one before (`cmp`).
- Every line pinned by an existing test stays untouched, or the test is not weakened to pass. The pins live in `tests/browser-page.sh` (print lines, page script, keydown count, base href, key/ini/tree meta lines), `tests/hostile-dom.sh` (base href rows) and `tests/launcher.sh`.
- Keep the file GNU GPL v2 header and all comments. Comments in the same terse style as the file.
- Commit message: a short imperative summary line, then a blank line, then a body with the reason. No trailer. One commit per task.
- Check: `make check`. Owner-checked paths: none beyond the story scope (page bytes, vendored files; the spec and README stay as they are).
- The work happens in the worktree `.worktrees/md-view-script-hygiene` on branch `refactor/md-view-script-hygiene`, base `origin/main` @ 57a88d4.

## T1: Single file:// escape recipe

**Depends on:** none
**Done check:** `make check` exits 0, and `grep -c 's/%/%25/g' lib/md-view` prints `1`
**Role:** implementer — review task-reviewer-critical

- Add one function `url_escape TEXT` that holds today's sed + awk recipe verbatim: `sed -e 's/%/%25/g' -e 's/ /%20/g' -e 's/#/%23/g' -e 's/?/%3F/g' -e 's/"/%22/g' -e "s/'/%27/g" -e 's/</%3C/g' -e 's/>/%3E/g' -e 's/&/%26/g' | awk 'NR > 1 { printf "%%0A" } { printf "%s", $0 }'`, fed by `printf '%s' "$1"`. The awk `%0A` rule and the printf `%s' (not `%s\n') stay; a trailing newline in the path is encoded, not added.
- `file_url PATH` becomes `printf 'file://%s' "$(url_escape "$1")"`. Its comment keeps the contract: same set as `base_url`.
- The `base_url` assignment at the current line 1125 becomes `base_url=file://$(url_escape "$dir")`. The `dir` trailing-slash logic above it does not change. The `A newline in the path becomes %0A` comment stays, attached to `url_escape`.
- `enc_path` is a different encoder (it encodes everything outside `A-Za-z0-9._~/-`). Do not route `url_escape` or `file_url` through it; do not change `enc_path`.
- Tests that pin the write path already exist (`tests/browser-page.sh` base href rows at :2439/:2470, `tests/hostile-dom.sh` base-href rows). Add nothing here; T4 covers the new unit tests.

## T2: Single-pass head check

**Depends on:** T1 (same file; keep regions disjoint)
**Done check:** `make check` exits 0
**Role:** implementer — review task-reviewer-critical

- Replace `head_has` with `head_has_all LINE...`. It returns 0 iff every argument is a whole line of the page head. The head is the lines up to and including the first line matching `^</head>$`. Implementation: `want=$(printf '%s\n' "$@")`; `sed -n '1,/^<\/head>$/p' "$page" | MD_WANT="$want" awk '...'` with `BEGIN { n = split(ENVIRON["MD_WANT"], a, "\n"); for (i = 1; i <= n; i++) if (a[i] != "") want[a[i]] = 1 }`, `($0 in want) { delete want[$0] }`, `END { exit length(want) ? 1 : 0 }`. One read of the file, one sed, one awk, one pipe. POSIX; ENVIRON, not `-v`, because the lines may hold backslashes.
- `head_has_all` with no arguments returns 0. Duplicate wanted lines collapse (associative array), so passing the same line twice is also 0 when it is present. An unreadable or missing page gives an empty head, so `head_has_all` returns 1 (the page is rebuilt), matching today's `sed | grep` behavior on a missing page.
- Update call sites. `page_fresh` checks its two or three lines in one call and returns 1 on mismatch, as before. The tree-line check (`[ "$head_ok" = 1 ] && head_has_all "$tree_line"`) likewise. `reuse_page`, `page_fresh` and `tree_newer` keep their logic.
- Remove the singular `head_has`. No wrapper, no compatibility shim.
- The required lines are safe for ENVIRON: `key_line`, `ini_line`, `base_line`, `tree_line` hold no raw newline today (base_line is newline-encoded by `url_escape`).

## T3: Source-only seam

**Depends on:** T2
**Done check:** `MD_VIEW_SOURCE_ONLY=1 sh lib/md-view </dev/null >/tmp/so.out 2>/tmp/so.err; test $? -eq 0 && test ! -s /tmp/so.out && test ! -s /tmp/so.err` exits 0, and `make check` exits 0
**Role:** implementer — review final

- Wrap the executable flow — from the `file=` initialization (current line 826) to the end of the file — in `if [ -z "${MD_VIEW_SOURCE_ONLY:-}" ]; then ... fi`. The `file=` assignment itself is inside the guard. Everything above stays unguarded: the `LC_ALL` export, `version`, `self_dir`, and all function definitions.
- With the variable set, sourcing the script must define the helpers, write nothing, open nothing and exit 0 immediately. No top-level statement above the guard may depend on a flag, the config, a file on disk, or the network.
- Do not rename the guard variable; `MD_VIEW_SOURCE_ONLY` is the contract T4 and the spec use.

## T4: Unit tests and make check

**Depends on:** T1, T2, T3
**Done check:** `make check` exits 0 and its transcript shows `tests/unit-helpers.sh` running after `tests/launcher.sh`
**Role:** implementer — review final

- New `tests/unit-helpers.sh`: POSIX `sh`; sources `./lib/md-view` with `MD_VIEW_SOURCE_ONLY=1`; sets `mk_fail` and counts; prints `ok <case>` / `FAIL <case>` per case; exits 1 if any case failed. Cases (all in `spec.md`):
- `trim`; `palette_ok` github/tokyo/bad; `num_val` (70, clamp, 0, non-numeric, empty, 6-digit).
- `browser_ok`: auto, firefox, chrome, safari, missing abs path, existing exec file, existing plain dir, `.app` dir on Darwin, relative word.
- `bake_ok` with `tree_depth=6`: plain nested, `.` part, `node_modules`, a byte below 0x20, depth 7.
- `bake_ext_ok` (PNG, jpeg, md); `bake_link_chain` with `tree_root=$(mktemp -d)` and a symlink leaf.
- `url_escape`: space, `%`, embedded newline, `<>&"?#`; `enc_path`: space, trailing newline kept.
- `head_has_all` on a three-line-head fixture: all-present and missing-line outcomes.
- The test creates its temp files under `mktemp -d`, cleans them in `trap ... EXIT INT TERM`, and never writes outside the temp folder.
- A deliberately broken helper must fail at least one case (verify once by hand: bump the `num_val` ceiling compare, see `FAIL num_val_clamp`, revert). The mutation is not committed.
- `Makefile`: add `tests/unit-helpers.sh` as the fifth command of `check`, after `tests/launcher.sh`. Keep the first-failure stop. `AGENTS.md`: the Build table lists `tests/unit-helpers.sh` as the fifth test with the same one-line meaning. The test count phrase in the rules matches ("four tests" → five runs, stop at first failure).

## Order and review

T1 → T2 → T3 → T4, one commit per task, each in the worktree. T1 and T2 are reviewed by `task-reviewer-critical` because they gate the byte-identical property of the head and the `<base href>` line. Final review (`final-reviewer`, full tier) follows T4.
