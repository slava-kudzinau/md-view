---
description: Close-out draft of the tree-scan-speed story with decisions, open minor findings and review yield.
---

# Close-out: tree-scan-speed

Result: tree mode walks the tree once, takes file sizes from `wc -c`, and reuses a cached page after one `find` walk. Check: `make check` exit 0 (218 pass, no skip). Bench: new page 0.49 s, cached page 0.13 s (target 0.3 s; BASE 0.57 s and 0.33 s).

Commits (BASE 9e9dbfc, head 6109d81):
- T1 `96c3cf5`: walk the tree once, sizes from `wc -c`.
- T2 `4aa7ef0`: reuse a cached tree page after one find walk.
- Fix round `07bd1f7`, `d1a2fee`, `dbe779d`, `7b15e44`: `head_has`, bench reuse check, rows that prove the walk, spec limit line.
- `7ad0f71`, `6109d81`: story spec and wording (main session).

## Decisions made in the build

1. T1-1: an unreadable tree file gets size 0 and state `page`, also over 1 MiB (BASE gave `big`). This follows the empty-element rule. Rejected: keep `big` with a second read.
2. Reuse trusts folder times and file times. An add, delete or rename that leaves every folder time at or below the page time is missed. `--no-cache` builds again. Rejected: scan on each run (loses the speed gain).
3. The four change rows set the changed folder or file ahead with `future`, so they prove the walk and not the clock (Linux coarse stamps). Rejected: rely on clock ticks.
4. `cache_tree_grown_big` checks the outcome. It fails without the file branch of `tree_newer`, not without the folder branch (F-2).
5. One row `cache_tree_page_limit_edge` pins the 8 MiB boundary (8388608 `page`, 8388609 `cut`).
6. `tests/bench.sh` adds a marker line to the cache page before run 2. A rebuild drops it and the cksum changes (F-8). The cached time prints before the failure message (F-9).
7. One function `head_has LINE` replaces four copies of the head check.

## Minor findings not fixed

- No row counts `find` calls on the scan path, and no row covers an unreadable file over 1 MiB. Add them to the spec "except" list or add `scan_one_walk`.
- No test covers a scan failure (`cannot read the file tree`, exit 2). It is older than this story.
- The story `spec.md` has two STE length hits (lines 25 and 41).
- `cache_tree_grown_big` passes the mutant "every line of `tree_newer` is a folder" (F-2, accepted).
- Not run on Linux (coarse file stamps). The rows no longer depend on the clock.

## Durable docs changed

- `docs/architecture/md-view.spec.md`: the "Files in the page", "Reuse", "Inputs", "Shell tools" and Tests rows, and the "Parked findings" line on the folder-time limit (`7b15e44`, `6109d81`, close-out).
- `docs/architecture/md-view.invariants.md`: new rule `[cache-tree]` (close-out).
- `AGENTS.md`: the `tests/` row names `bench.sh` (close-out).
- No ADR: the folder-time trade-off is in the spec "Parked findings" list.

## Lessons

- A reuse rule that drops the scan moves the guard to file times. Write the new limit into the spec in the same story.
- A row that changes a folder must set the time ahead with `future`. Do not trust the clock.
- A promoted lite story needs its story `spec.md` checked with `check_ste.py` before the second final review.

## Review yield

_The findings of each reviewer role: Critical, Important and Minor._

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| final-reviewer-light | sonnet | 2 | 0 | 1 | 10 |
