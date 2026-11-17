# Close-out draft: diagram-laser-pointer

Commits: T1 `9b56196` (page code) + `7a32d82` (z-index ruling) + `230317b` (story docs); T2 `67c6d93` (test row + spec + README) + `190986f` (paint-gate fix); close-out `HEAD`. Check: `make check` exit 0 (all four tests pass, no skips).

## Rulings

1. Scope: laser only in the fullscreen diagram viewer; normal-view text and inline diagrams follow as a story of their own.
2. State: in-memory on the viewer object; survives close/reopen in the page session; a reload resets; no new `localStorage` key.
3. Toggle mode via the `●` button and `l`/`L`. One `toggleLaser` function sets class `md-laser-on` on the dialog, which shows a `div.md-laser` dot. The dot anchors to the dialog, not the scrolling content.
4. `z-index: 1` on the dot from the start (was a contingency in the plan).
5. Test coordinates: pointermove at the `.md-vbox` rect center, dialog rect computed in the same tick; paint poll at 50 ms.

## Parked findings

- Minor: none open. The gate paraphrase split landed at close-out.
- Minor: story `status: in-review` and index `in-review` retire when the owner merges (retire step).

## Lessons

- Headless rows that seed the success title must seed a failing one. Put the paint gate in the asserted flags, not only in the loop exit.
- `edit` headers keyed `lib/...` can land in the main checkout while a worktree story runs; use worktree-prefixed paths for every dispatch brief.

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| final-reviewer-light | omp-configured | 1 | 0 | 1 | 3 |
