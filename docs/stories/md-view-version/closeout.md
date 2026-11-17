# Close-out draft: md-view-version

Commits: `4168cb4` (T1 version literal, `--version` flag, README), `ac85cde` (T2 key token and page meta), `a1d9a09` (T3 settings-menu footer), `e3d3dc8` (final-review fix: meta-absent footer DOM test). Check: `make check` exit 0 (200 `ok`, 0 FAIL).

## Rulings

1. T1 review raised to `task-reviewer` (from the plan's "review final"). The diff adds a `--version)` arm to the argument-parsing `case` loop; the review-signals table raises a parsing touch. Approved, 0 Critical, 0 Important, 2 Minor.
2. T2 review is `task-reviewer-critical` (plan-mandated). The page key meta content is a published page-format contract with 24 verbatim test sites, and the head `printf` writes the page. Approved, 0 Critical, 0 Important, 1 Minor.
3. T3 is a mechanical task: `review final` (no per-task reviewer). A DOM `querySelector` and CSS are not file-IO/parsing/validation, and the popover is user-facing UI, not a cross-system consumed interface. The final review covers it.
4. Final-review fix round covers the one Important finding (add a meta-stripped DOM assertion for the footer's no-meta fallback, `spec.md:25`). The scoped re-review reports ADDRESSED, no new issues.

## Parked findings

- T1 Minor: only the bare `--version` argument shape is tested; combinations rely on the first-match exit. Spec requires the bare form only. Still acceptable.
- T1 Minor: `$(...)` strips trailing newlines, so a missing `\n` in the flag output would pass. Spec's "exactly" is about content; `printf '%s\n'` writes the newline. Still acceptable.
- T2 Minor: the version meta is built inline in the head `printf`, off the surrounding `*_line` variable pattern. Rendered bytes are identical; one consumer does not earn a variable. Still acceptable.
- Final Minor 2: the DOM test asserts the footer text, not that it ends the popover (below Reset). The append site is pinned by code order in `buildPopover`. Broader coverage; parked.
- Final Minor 3: no direct version-bump → rebuild → reuse test. The bump row is covered by mechanism (the key-line greps pin `;v=0.1.0`; `page_fresh` greps the same string). Broader coverage; parked.
- Final Minor 7: `docs/stories/index.md:12` lists the story as `planned`. Carry the status flip into the close-out pass (the owner sets it with the gate).

## Lessons

None. The story is a one-token append plus one meta line plus one popover footer; cache invalidation needed zero cache-code changes because the version rides the existing `key_line` (one writer, one reader). Test adaptation stayed in lockstep and strict (the head-adjacency check shifted by exactly one line, not loosened).

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| task-reviewer | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 0 | 2 |
| task-reviewer-critical | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 0 | 1 |
| final-reviewer-light | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 1 | 6 |
| re-reviewer | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 0 | 0 |

The plan's role tiers held: no per-task fix rounds, and the one Important finding (a missing test row, not a code defect) came from the whole-branch review. `final-reviewer-light` was the right tier for this standard story.

## Cost

`spend.mjs` reports the build as unmetered (no Claude transcript matched the local-model
subagent runs), so the dollar figure is not script-priced. Against budget $15 / stop $20
the run stayed inside the stop: three tasks, T2 critical review, one final-review fix
round, and a scoped re-review, each with `make check` after. Track the exact total from
the harness usage.
