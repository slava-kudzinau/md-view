# Close-out: md-view-script-hygiene

Result: the duplication and per-check process spawns are gone from `lib/md-view`, and the pure helpers now have a unit-test seam. Check: `make check` exit 0 (five tests, `tests/unit-helpers.sh` fifth), `sh tests/bench.sh` new page 0.45 s / cached page 0.11 s (budgets 0.55 / 0.15).

Commits: `11c90dd` T1 single file:// escape recipe. `44972a8` T1 fix (comment pointer). `9959169` T2 single-pass head check. `902f80b` T3 source-only seam. `698cada` T4 unit tests + `make check`. `82d90c8` final-review fix. Base `57a88d4`.

## Decisions made in the build

1. One shared `url_escape` holds the sed + awk recipe verbatim; `file_url` and `base_url` call it. Alternative rejected: route both through `enc_path`. It encodes `[` and non-ASCII bytes differently. The `<base href>` bytes are pinned byte for byte. `enc_path` stays the separate, stricter encoder.
2. `head_has` (sed + grep per call) is gone. `head_has_all LINE...` does one read of the head (up to the first `^</head>$` line), one sed, one awk. Wanted lines go via `ENVIRON`, never `-v`; they may hold backslashes. Alternative rejected: temp file + awk (extra cleanup path); grep per line (the spawn cost this story removes).
3. The executable flow from `file=` to EOF sits inside `if [ -z "${MD_VIEW_SOURCE_ONLY:-}" ]`. The four function definitions that lived below that line were hoisted above the guard: `head_has_all`, `page_fresh`, `tree_newer`, `reuse_page`. `MD_VIEW_SOURCE_ONLY=1 sh lib/md-view` now defines every helper, exits 0, writes nothing. Alternative rejected: a single monolithic `if` around `file=`..EOF (it would leave `head_has_all` undefined and break the unit tests). The guard variable name is the T4/spec contract.
4. The reuse decision and its failure modes are unchanged. An unreadable or missing page yields an empty head, so `head_has_all` returns 1 and the page is rebuilt. This matches the old `sed | grep` behavior.
5. Unit tests source the script with `MD_VIEW_SOURCE_ONLY=1`. No new tool or file in the install; the single-script shape (ADR-001) is kept. `make check` runs the suite fifth, after `tests/launcher.sh`, first-failure stop preserved.
6. Byte-identity is enforced by comparison, not by inspection. Pages built at an `origin/main` worktree and at this branch are `cmp` clean, as is the `<base href>` line. The fixture parent holds spaces, `%`, `#` and a trailing newline. The reuse path gained no new spawns; the bench confirms (0.45 / 0.11 s).
7. G2-design was waived by the owner (2026-11-22, "go it autonomous mode"). The plan verifier ran twice (ASK, then FIX). Both rounds were corrected. The docs are current.

## Minor findings not fixed

- T1: stale `file_url` comment pointer (review called it; fixed in `44972a8`, re-review ADDRESSED). Nothing outstanding.
- T4: `enc_path_utf8` is awk-dependent. macOS `/usr/bin/awk` is UTF-8 aware, so a byte-C3-A9 argument yields `a%E9`, never the spec's `a%C3%A9`. The test detects a byte-oriented awk and asserts `a%C3%A9` only there, else it prints `skip`. It printed `ok` under `make check` on this machine. Not fixed: the story forbids fixes for defects found through the new unit tests, and the hard byte-identical constraint governs. Soft spot: on a UTF-8-aware awk the spec's UTF-8 row is verified nowhere.
- Notes from the final review, not defects. `head_has_all ""` returns 0 without reading the page, and an empty wanted line is silently dropped (plan-mandated; no caller passes an empty line). `docs/stories/index.md` shows the story as `planned` while `story.md` says `in-progress` (pre-existing cosmetic convention).

## Durable docs changed

- `docs/architecture/md-view.spec.md`: one line, the `make check` description, four tests to five tests (owner-approved, 2026-11-22). No other durable-doc change; the spec governs exact values and now names five tests.
- `AGENTS.md`: the Build table and the test-count phrase name the fifth test (`tests/unit-helpers.sh`). Not a durable architecture doc; a rules index, edited inside the story scope.
- No spec semantics, ADR, invariants or README change. No ADRs written: the choices above are story-local implementations of existing invariants, not architecture changes. If the awk-dependence of `enc_path` matters to the project, it is a candidate for the invariants at close-out, owner's call.

## Lessons

- The binding scan ruling paid off: hoisting the four below-`file=` helpers was the one place the plan's "wrap from line 826 to EOF" reading would have broken the unit tests. Rulings belong in the implementer's brief, not in mid-task messages.
- `review-yield.mjs counts` only counts `### N. <Severity>:` headings under a `## Issues` section; task reviews that write findings under a plain line score 0. The table undercounts T1 (one Minor). Future reviewer briefs should demand the exact `## Issues` heading (this story's T2/T3/final-review briefs did).
- The bench gate (new ≤ 0.55 s, cached ≤ 0.15 s) is the check that catches spawn regressions on the reuse path; prose review cannot. The implementer skipped it once; the orchestrator rerun closed it. Keep the bench in the done check, not only in Global Constraints.

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| review | reviewer-bundled-default | 4 | 0 | 1 | 3 |

Per review-yield.mjs on the ledger, task-1-review.md scores 0/0/0 for the heading-shape reason above. Hand count: T1 0/0/1, T2 0/1/0, T3 0/0/1, final 0/0/2. One fix round each for T1, T2 and the final review; T4 had no per-task review, the final review covered it. The one Important finding was plan-mandated (implementer skipped the bench); fixed by an orchestrator-run bench, not a code change. Critical/Important were never found in code by any review. No escalation changed a reviewer's verdict. The full-tier final review approved the branch. Role routing: the configured `task-reviewer-critical` and `final-reviewer` roles had no dispatchable agent in this harness. Reviews ran as `reviewer` with the full critical brief (rulings in progress.md).
