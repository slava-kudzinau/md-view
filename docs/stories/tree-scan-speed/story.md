---
description: Make a tree page open fast on a large folder, with one walk of the tree and no read of file content to check the cache.
status: in-progress
size: S
depends-on: line-anchor-nav
risk: none
---

# Story: tree-scan-speed

## Goal

In a large folder, a cached page opens in about 0.8 s and a new page in 1.2 s. Most of that time is repeated work in the shell. The script walks the tree two or three times. It also reads each file only to get its size. This story removes that work. The written page does not change.

## Context

- `lib/md-view`: `scan_find` (line 416) and `scan_tree` (line 438). The second walk is at line 441 and the awk `size()` at line 459.
- `lib/md-view`: `page_files` (line 545), `tree_sum` (line 844) and `page_fresh` (line 860). The third walk is at line 883.
- Spec `docs/architecture/md-view.spec.md`: the tree rows "Files in the page" (1 MiB `big`, 8 MiB `cut`), the cache rows "Reuse" and "Inputs", and the "Shell tools" row.
- Invariants `docs/architecture/md-view.invariants.md`: the `[cache]` rule (`key_line` byte for byte).
- ADR-001: a standalone POSIX `sh` tool with no build step.

## Scope

**In:**

| Part | Change |
|---|---|
| Fast cache check | Before `scan_tree`, one `find -newer <page>` walk with the `scan_find` skip rules lists the newer folders and tree files. Nothing newer, and the other checks of `page_fresh` pass: the script reuses the page with no scan and no file read. Something newer: the full scan runs, and the page is reused only if the tree state line matches, as today. This walk replaces the walk at line 883. |
| One walk with sizes | `scan_find` gets each path and its byte size from `-exec wc -c {} +` in the same walk. This removes the second walk (`-size +1048576c`) and the awk `size()` reads. `big` is a size over 1048576 bytes. The 8 MiB total adds the same byte sizes, the opened file first. The `total` lines of `wc` are dropped: each scan path starts with `./`. |
| Spec | Add `wc` to the "Shell tools" row. Write the fast check into the "Reuse" row. State that the sizes are byte sizes. |
| Tests | New rows in `tests/browser-page.sh` add, delete, rename and edit a tree file, and grow one past 1 MiB. After each change, the tree page is built again. Each row fails against a broken check before it is trusted. `case_cache_tree_reuse` and `case_tree_page_cut` pass with no change. |
| Benchmark | `tests/bench.sh`, outside `make check`. It makes a tree of about 3,000 files in a temporary folder. It prints the time of a new page and of a cached page. |
| Backlog | One item: measure the browser load of a large tree page. The page is 8.7 MB on a 2,812-file folder. Then decide on the 8 MiB limit or the 500-file cap. |

**Out:**

- A split of `lib/md-view` into more scripts.
- A rewrite in another language.
- A change to the 8 MiB limit, the 1 MiB limit or the 500-file cap (backlog).
- The browser side: `lib/page.js` reads all embedded files at load (backlog).

## Size

S. One script region (about 60 lines), one spec section, about five test rows, one new script. No new flag, key or page change. With three tasks the plan comes out standard tier.

## Unknowns

- The exact time gain. The first task measures it with `tests/bench.sh` before and after. Target: a cached run on a 3,000-file tree under 0.3 s.
- Whether `wc -c` output has the same shape on macOS and Linux (leading spaces differ). The first task checks both forms in awk, splitting on blanks.

## Acceptance criteria

- `make check` passes, and its `skip` lines are read.
- A cached tree page opens with one walk of the tree and no read of file content. The proof is a test row or a trace that counts the `find` calls.
- A tree page is built again after a tree file is added, deleted, renamed or edited, and after a tree file grows past 1 MiB. Each of these rows fails against a broken check first.
- A change that is not in the tree (a hidden file, a file in `node_modules`, a non-Markdown file) does not build the page again (`case_cache_tree_reuse`).
- For a given tree, the page bytes do not change. One exception: a file with no final newline, within 1 byte of the 8 MiB limit.
- `tests/bench.sh` prints both times. The PR states the times before and after.
- At close-out: the spec rows "Shell tools" and "Reuse" are updated. The `[cache]` invariant gets the fast-check rule if the build shows that it is needed.

## Notes

- Owner decisions, 2026-11-18:
  - "no split" of the script and no Rust. Reasons: AGENTS.md (POSIX `sh` only, add no new tool) and ADR-001.
  - Sizes from `find -exec wc -c`. `wc` goes into the spec tool list.
  - The page size stays as it is. A backlog item records it.
  - Add `tests/bench.sh`, outside `make check`.
  - Design approved: "approved".
- Measures, 2026-11-18, on a 2,812-file folder (1,255 folders):
  - Cached run: 0.8–0.9 s. New page: 1.2 s.
  - Bare `find` walk: 0.14 s. awk read of all files: 0.64 s. `cat` of all files: 0.12 s.
  - Page: 8.7 MB, at the 8 MiB limit.
- Edge cases settled in the design:
  - A file with no final newline counts 1 byte less than the awk count.
  - A file named `total` cannot clash with the `wc` total line.
  - A new folder below `tree_depth` makes the full scan run, and the page is reused.
  - `-newer` is strict, as today.
- Risk: none. The change keeps every input and output. The story can add a flag if the plan finds one.
- Tier: `flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none`. Run it again with `--tasks` after the plan.
- Branch: `refactor/tree-scan-speed`, worktree `.worktrees/tree-scan-speed`. Base: `origin/main`. Rebase after line-anchor-nav merges, because both stories edit `lib/md-view` and `tests/browser-page.sh`.
- Budget: S, $8. Hard stop: $10.
- Check: `make check` (AGENTS.md).
- started: 2026-11-18T21:32:41Z
- flow (2 tasks): `flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none`
- Gate page: read later in the PR. Owner, 2026-11-18: "go in autonomous mode".
- Hooks: preflight none, verify none, status none, cleanup none (AGENTS.md names no hooks).
- Owner-checked paths: none named in AGENTS.md.
- Promoted to standard, 2026-11-18: the lite final review found one Important issue (reuse trusts folder times). `flow tier=standard docs=spec,plan design=no orchestrator=yes final=final-reviewer-light gate=read-later scan=no verifier=none`
- BASE: origin/main at 9e9dbfc. The branch was rebased onto it after line-anchor-nav merged.
