---
description: Dedup the file:// escape recipe, make the head check one pass, and add a source-only seam with unit tests for the pure helpers in the script.
status: planned
size: M
risk: contract
refs: ADR-001
---

# Story: md-view-script-hygiene

## Goal

`lib/md-view` carries duplicated and spawn-heavy code that costs nothing today but taxes every future change and review. This story removes the duplication and the per-check process spawns. It adds a unit-test seam for the pure shell helpers. The written page stays byte-identical.

## Context

- The script is POSIX sh, one file, no build step (ADR-001; AGENTS.md "POSIX sh only"). Install copies it with `lib/page.js`, `lib/page.css` and nine vendored files.
- Bench today (3000-file tree, `tests/bench.sh`): new page 0.53 s, cached page 0.14 s.
- The file:// escape recipe (sed + awk, `%XX` uppercase) appears twice with the same bytes: `file_url` at `lib/md-view:61` and the `base_url` pipeline at `lib/md-view:1125`.
- The base pipeline feeds `<base href>` at `lib/md-view:1128`. It is pinned by spec line 105, tests/browser-page.sh:2439 and :2470, and the tests/hostile-dom.sh base-href rows.
- `head_has` (`lib/md-view:1141`) is a `sed` plus a `grep` per call. It is invoked up to 4 times per run, in `page_fresh` and the tree-line check at `lib/md-view:1165-1225`. That is 6–8 process spawns on the reuse path.
- The script cannot be sourced for tests. The executable flow, from the argument parsing at `lib/md-view:826` to the end, runs top to bottom and calls `exit`.
- The pure helpers (`num_val`, `trim`, `palette_ok`, `browser_ok`, `bake_ok`, `bake_ext_ok`, `bake_link_chain`, `enc_path`) are only reachable through end-to-end runs.
- Risk `contract`: the page head lines (`<base href>`, the key meta, the ini state line) are pinned byte for byte. Tests pin them, and so does the cache-reuse key in the spec (Reuse row, line 221).
- A silent change there breaks page reuse without any test looking wrong.

## Scope

**In:**

- One shared encoder for the file:// escape recipe: `enc_path` becomes the single implementation (or a function both `file_url` and `base_url` call). `file_url` keeps its exact output; the `<base href>` line keeps its exact bytes, including the trailing-newline `%0A` rule.
- `head_has` reads the head of the page once and checks all needed lines in one pass. One `sed` for the head range, then one `grep` or `awk` for the list.
- The reuse decision and its failure modes are unchanged.
- A source-only seam: the executable flow from argument parsing to EOF is wrapped in `if [ -z "${MD_VIEW_SOURCE_ONLY:-}" ]; then … fi`. With the variable set, the script defines its helpers and exits 0, writes nothing, opens no browser.
- `tests/unit-helpers.sh`: sources the script with `MD_VIEW_SOURCE_ONLY=1`. It unit-tests `num_val` (values over 5 digits, the 0 rejection), `trim` and `palette_ok`.
- It also unit-tests `browser_ok` (temp dir, `.app` dir on Darwin, non-executable file, `*`), `bake_ok` (dot parts, `node_modules`, control bytes, depth), `bake_ext_ok` and `bake_link_chain` (temp symlink).
- It tests `enc_path`: newline at end of text, space, `%`, a non-ASCII byte. It prints `ok <case>`/`FAIL <case>` and exits 1 on any failure, matching the other tests.
- `Makefile`: `make check` runs `tests/unit-helpers.sh` after `tests/launcher.sh`. `AGENTS.md` build table lists the fifth test the same way.

**Out:**

- No change to the page bytes: not the head lines, not the escaped Markdown body, not the vendored-file inlining.
- Not this story: a Rust or native rewrite. Also out: `bake_assets` O(n²) (fine at the 500-file cap), `wc -c` vs `stat` (not portable), `ini_state`'s `ls` parsing.

## Size

M. Signals: net ~150 lines across `lib/md-view`, one new test file, one `Makefile` line, one `AGENTS.md` line. No spec, ADR or invariants change; no new input handling; all risk sits in one file, and the byte-identical gate contains it.

## Unknowns

None. The unit-test case list is fixed above. The builder may drop a redundant case. A bug found is reported, not fixed here.

## Acceptance criteria

- `make check` passes and runs `tests/unit-helpers.sh` as its fifth test; the other four tests pass with no edit to any pinned line.
- `git grep -n 's/%/%25/g' lib/md-view` finds one hit (the shared encoder) only.
- For a fixture path with spaces, `%`, `#` and a trailing newline, `<base href>` and the bake `file_url` output are byte-identical. A stashed before/after diff of the written pages is empty.
- `head_has` performs one read of the page head per call (review), and the reuse tests in `tests/browser-page.sh` pass unchanged.
- `MD_VIEW_SOURCE_ONLY=1 sh lib/md-view < /dev/null; echo $?` prints `0`, writes nothing, opens no browser.
- `tests/unit-helpers.sh` passes; a deliberately broken helper (e.g. `num_val` ceiling) fails at least one unit case (verify by mutation, then revert).
- `sh tests/bench.sh` shows no regression: new page ≤ 0.55 s, cached page ≤ 0.15 s (today: 0.53 s / 0.14 s).
- Vendored files and `lib/page.js`, `lib/page.css` untouched.

## Notes

Owner decisions, 2026-11-22:

- The source-only seam and its unit tests are in scope; one story, not two. The two dedups and the seam all edit `lib/md-view`, and splitting means two passes over the same regions in series.
- Page output byte-identical is a hard constraint. Any diff in the written page fails the story.

Builder's calls:

- No spec, ADR or invariants change: the meaning of no rule, flag or format changes.
- Bench gate: new ≤ 0.55 s, cached ≤ 0.15 s. The reuse path must not gain process spawns.
- `bake_assets` and `wc -c` stay as they are.

Branch `refactor/md-view-script-hygiene`, base `main`. Budget for M; hard stop at the size cap, then split the seam from the dedups.

Check command: `make check` from the repo root, then `sh tests/bench.sh`.
