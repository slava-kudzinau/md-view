---
description: The lite plan for tree-scan-speed, with the spec, the global constraints and two tasks.
---

# Plan: tree-scan-speed

Tier: lite (`flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none`). No `spec.md`: the spec is the section below.

## Spec

A tree page (the page of a Markdown file plus the other Markdown files of its root folder) opens fast on a large folder. The written page does not change.

1. **One walk with sizes.** The scan walks the tree one time. The same walk gets the byte size of each tree file from `wc -c`. The script does not read a tree file to count its size. A tree file over 1048576 bytes is `big`. The 8 MiB limit (8388608 bytes) adds the byte sizes: the opened file first, then each file in tree order, as today.
2. **Fast cache check.** Before the scan, the script does the checks of today that do not need the scan. The page exists. No input is newer. The head has the key line and the `config.ini` line. In tree mode the head also has the `<base href>` line of this root (new). Then one walk lists each tree folder and each tree file that is newer than the page.
   - Nothing newer: the script reuses the page. No scan, no file read.
   - Something newer, but no tree file: the scan runs. The page is reused if its head has the tree state line of this scan, as today.
   - A newer tree file: the page is built again.
   This walk replaces the third walk of today (in `page_fresh`).
3. **Same page bytes.** For a given tree, the page bytes do not change. One exception: a file with no final newline counts 1 byte less than before. So a file within a few bytes of the 8 MiB limit can change state.

### Done

`make check` exits 0 with its `skip` lines read. `sh tests/bench.sh` prints the time of a new page and of a cached page on a tree of about 3,000 files. The cached time goes down, with a target under 0.3 s.

## Global Constraints

- POSIX `sh` only. Add no new tool or package. `wc` is a POSIX tool and goes into the spec "Shell tools" row. Do not use `find -printf`, `stat`, `-readable` or GNU-only flags.
- Files this story may touch: `lib/md-view`, `tests/browser-page.sh`, `tests/bench.sh` (new), `docs/architecture/md-view.spec.md`. Not `lib/page.js`, `lib/page.css` or a vendored file.
- Do not change the page bytes, the `--list-tree` output, the key line, the tree state line (`<!-- md-view-tree: <cksum> <count> -->`) or any flag.
- The skip rules of `scan_find` stay as they are (`.git`, `node_modules`, hidden folders and files, a name with a byte below 0x20, a path deeper than `tree_depth`, symlinks).
- `wc -c` output: leading blanks, a number, one blank, the path. Parse it in awk: remove the leading blanks, the number is the text up to the first blank, the path is the rest. A size line has a path that starts with `./`. Drop each other line (the `total` line). Leading blanks differ on macOS and Linux.
- A tree file that `wc` cannot read has no size line. Give it size 0 and state `page`, as the awk `size()` does today.
- The opened file counts first toward 8388608. Get its size with `wc -c < <file>` (one `fstat`, no read of the content). A read error gives 0.
- Every `find` keeps `2>/dev/null` and the `|| return 1` handling of today. A failed walk fails closed: the page is built again.
- `-newer` is strict, as today. macOS and GNU `find` compare in nanoseconds (checked on macOS 2026-11-18).
- Rules from the project (AGENTS.md and the invariants):
  - Treat every file name as untrusted. Never use `eval` or `sh -c` with a file value.
  - `page_fresh` reuses a page only when the head `key_line` matches byte for byte (`[cache]`).
  - Do not remove a `skip` rule.
  - Run a test that must catch a regression against that regression first.
  - `tests/browser-page.sh` pins the two print lines, the page script and the keydown listener count. Do not change them.
- Above each function, a short comment says what it does. Update the comments of `scan_find`, `scan_tree` and `page_fresh`.
- Commit message: a short imperative summary line. An optional body follows after a blank line. No trailer (AGENTS.md). One commit per task, or a few small ones.
- BASE (the code before the change): commit `9e9dbfc`.
- Scratch files (old script copies, compared pages, bench output) go under `.build/tree-scan-speed/` in the worktree. Git ignores `.build/`.
- The 0.3 s target is reported, not enforced. A miss does not fail a task.
- Spec text: write it in ASD-STE100 Simplified Technical English, in the style of the rows around it. The final review checks it.
- Check: `make check`. Owner-checked paths: none.

## T1: One walk with sizes, and the benchmark

**Depends on:** none
**Done check:** `make check` exits 0, and `sh tests/bench.sh` exits 0 and prints two times
**Role:** implementer — review final

1. Write `tests/bench.sh` first. It is not in `make check`. It makes a tree in a temporary folder with one awk program, with no random numbers. File `i` (0 to 2999) is `d<i%10>/d<i%100>/d<i%1000>/f<i>.md`, so there are 1,110 folders and the depth is 4. Its size is `100 + (i * 7919) % 20000` bytes of text lines. The root also holds `index.md` and ten `n<k>.txt` files. It sets `HOME`, `XDG_CONFIG_HOME` and `XDG_CACHE_HOME` to temporary folders, so the real cache is not used. It runs `sh lib/md-view --no-open <tree>/index.md` two times and prints two lines: `new page: <seconds> s` and `cached page: <seconds> s`. Time each run with the POSIX `time -p` utility: `command time -p sh "$script" --no-open "$f" 2> "$t"`. A clean run of the script writes nothing to stderr. Take the second field of the line whose first field is `real` in `$t`. A nonzero exit of the script fails the bench. It removes the temporary folder at exit. It takes an optional argument: the path of the script to run (default `lib/md-view` of the checkout).
2. Run `tests/bench.sh` on the code before the change. Put both times in the report.
3. In `scan_tree`, get the paths and the sizes in one walk: `scan_find -exec wc -c {} +`. `scan_find` puts `-print` after its arguments, so each tree file gives one `./<path>` line, and `wc` gives the size lines. The two kinds of lines can come in any order. A path line starts with `./`. A size line starts with a blank or a digit. The path lines go to the sort of today, which sets the tree order. The size lines go to the state awk as a map from `./<path>` to bytes, in its first phase (where the `big` lines go today). The awk then reads the sorted list and looks up each size in the map, so the order of the walk output does not matter.
4. Remove the second walk (`scan_find -size +1048576c`) and the awk `size()` function. `big` is a size over 1048576 bytes. The opened file size comes from `wc -c <`.
5. Prove the page bytes. Get the old script with `git show <BASE>:lib/md-view`, next to copies of the `lib/` files. Build the page of the bench tree and of `tests/fixtures` with each script, with `--no-open --out`. Then `cmp` each pair. Put the commands and the result in the report.
6. Run `tests/bench.sh` again and put both times in the report.

Tests: no new row. `case_scan_big`, `case_scan_cut`, `case_tree_page_cut` and `case_tree_page_markup` pin the states and the page. They must pass with no change.

## T2: Fast cache check

**Depends on:** T1
**Done check:** `make check` exits 0 with the new rows `cache_tree_one_walk`, `cache_tree_grown_big` and `cache_tree_root_moved` in the case list
**Role:** implementer — review final

1. Move the `scan_tree` call. `--list-tree` keeps its place: when `list_tree` is 1, the script scans, prints and exits as today. Else the scan runs after the fast check, then `tree_line` and the tree attributes of `html` are set as today.
2. Move the block that sets `dir` and `base_url` above `page_fresh`. It does not depend on the scan.
3. `page_fresh` returns true when all of these hold. The page exists and is not a link. No input is newer than the page. The head has `key_line` and `ini_line`. In tree mode the head must also have the line `<base href="$base_url">`. Build that line with the same `printf '<base href="%s">'` and the same `base_url` variable that the page write uses, and compare with `grep -qxF`, so the text is the same byte for byte. This catches a root that changed (for example, a `.git` removed with `root=repo`).
4. A new function `tree_newer` prints the newer tree folders and tree files, one `./<path>` per line, from one walk: `scan_find -newer "$abs_page" -print -o -type d -newer "$abs_page"`. `scan_find` adds its own `-print` at the end, so the file branch reads `<tree file rules> -newer P -print` and the folder branch reads `-type d -newer P -print`. Each path prints once. The folder branch adds each newer folder that the skip rules do not prune, the root `.` included. Do not change the expression of `scan_find`.
5. A new function `reuse_page` holds the reuse steps of today. It restores the umask, opens the page when `do_open` is 1, and exits 0. Both reuse points call it.
6. The flow:
   1. Set `head_ok=0`. If `cached` is 1, `no_cache` is 0 and `page_fresh` is true: in one-file mode, `reuse_page`. In tree mode, run `if newer=$(tree_newer); then ... fi` (the status of the assignment is the status of the walk; a failed walk: build). Empty output: `reuse_page`. Else, if no output line is a regular file (`[ -f "$tree_root/${line#./}" ]`), set `head_ok=1`.
   2. In tree mode, `scan_tree` and set `tree_line`.
   3. If `head_ok` is 1 and the head has `tree_line`: `reuse_page`.
   4. Build the page.
7. Remove the third walk (the old `scan_find -newer` in `page_fresh`).
8. Add three rows to `tests/browser-page.sh` and to the case list after `cache_tree_renamed_file`:
   - `cache_tree_one_walk`: `tree_proj`, build the page, `mark`. Then put a `find` shim and a `wc` shim first in `PATH`. Each shim appends `$*` as one line to a log in `$d`. Then it runs the real tool by its absolute path. Find that path with `command -v` before `PATH` changes. Run again. Expect the page reused (`marked`), exactly one logged `find` call whose first argument is `.`, and no `wc` call. Run the row against the code of T1 first: it must fail there.
   - `cache_tree_grown_big`: `tree_proj`, build, `mark`. Grow `proj/a.md` past 1048576 bytes with `mklong` (its time is now). Run again. Expect a new page (not `marked`) with the index line `big a.md`.
   - `cache_tree_root_moved`: `write_ini '[View]' 'root=repo'`. Make `proj/.git` and `proj/sub/o.md`, old times, then build `proj/sub/o.md` and `mark`. The root is `proj`. Remove `proj/.git`; the root is now `proj/sub`. Run again. Expect a new page (not `marked`) whose `<base href>` ends in `/sub/`. Run the row against a `page_fresh` with no `<base href>` check first: it must fail there.
9. Prove the two branches of the walk. Run `make check` with the `-o -type d` branch removed: `cache_tree_added_file`, `cache_tree_deleted_file` and `cache_tree_renamed_file` must fail. Run it with the newer-file test removed (treat every line as a folder): `cache_tree_changed_file` and `cache_tree_grown_big` must fail. Put the failing case names in the report. Restore the code.
10. Spec `docs/architecture/md-view.spec.md`:
    - "Reuse" row: add the fast check, the `<base href>` line in tree mode and the three outcomes of the walk.
    - "Inputs" row: in tree mode, the newer tree folders and tree files of one walk.
    - "Files in the page" row: the sizes are byte sizes from `wc -c`.
    - "Shell tools" row: add `wc`.
    - "Tests" table: the `tests/browser-page.sh` row does not list cache rows, so it stays. Add a row for `tests/bench.sh`: it prints the two times and is outside `make check`.
11. Run `tests/bench.sh` and put both times in the report.
