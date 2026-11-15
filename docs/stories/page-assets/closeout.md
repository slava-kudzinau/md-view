---
description: Close-out draft of the page-assets story. It lists the commit, the check result, the rulings, the parked findings and the review yield.
---

# Close-out draft: page-assets

Commits: 30190fe (T1, the only task). Check: `make check` exit 0 (all four tests pass, no `skip` line; `root_slash_off: not run` also on the base).

The byte proof (plan T1 done check) printed `same`. The final reviewer compared 66 runs with origin/main (8 fixtures, tree on and off, four flag sets, one config file): no difference. A control with one changed byte did show a difference.

## Rulings

1. The orchestrator amended the T1 commit trailer to `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. The plan requires this trailer. The implementer had used a Haiku trailer. The commit is not pushed.
2. Task review ran as `task-reviewer-critical`, as the plan names (a public contract: exit 3, install tree).

## Parked findings

- Minor: the list of inlined files exists in several places in `lib/md-view` and the tests. It was so before this story.
- Minor: the exit 3 test stops at the first failing file, so it reports `page.css` alone only after `page.js` passes.
- Minor: the plan proof command can print `same` if both scripts fail. The final review compared captured outputs and a control run, so this build is proven.

## Close-out changes to durable docs

The main session made these changes. They include the Important finding of the final review.

- `docs/architecture/md-view.spec.md`: six rows name `page.js` and `page.css`. They are the exit 3 row, steps 1 and 4 of "How the page is made", the reuse inputs, the Install row and the `self_dir` line.
- `docs/architecture/md-view.invariants.md`: the `[paths]` rule names the two page files.
- `AGENTS.md`: the `make install` row, the `lib/` rows and the vendored-files rule. The rule now says that `page.js` and `page.css` are md-view code, not vendored.
- No ADR. The choice is small and the code and `AGENTS.md` show it.

## Lessons

None for the plugin. A Haiku implementer ignored the exact trailer in the brief; the dispatch header must keep the trailer line.

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| task-reviewer-critical | opus | 1 | 0 | 0 | 3 |
| final-reviewer | opus | 1 | 0 | 1 | 2 |
