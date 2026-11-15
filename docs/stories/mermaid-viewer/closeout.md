# Close-out draft: mermaid-viewer

Commits: db1df08..2203f51. T1 803bdbe (button bar, open and close), T2 f769a39 and b1b0f7d (zoom, pan, keys, fix round), T3 ce34581 (close on redraw test), final fix 2203f51. Check: `make check` exit 0 (192 ok, no skip, no FAIL; the line "root_slash_off: not run" is old and is not a skip). Ten `ok viewer:` rows.

## Rulings

1. Fit is one function path through `setZoom` (R1). The spec wins.
2. Tests close the dialog with the x button, because a synthetic Esc does not close a native dialog (R2).
3. `tests/browser-page.sh` changed to follow the new print line and viewer CSS (two pinned print lines; `tree_off_same_page` maps the viewer lines with `viewer_map`). It stays as strict as before (R3). The viewer rules must stay inside the `viewer_map` range of `lib/page.css`.
4. The viewer keys (`+ = - 0 1`) are in the one page `keydown` handler, not in a listener on the dialog, because `browser-page.sh` pins one `keydown` listener (R8). The spec Keys row says "keydown on the dialog": update it at close-out. The behavior is the same, since dialog keys bubble.
5. The README paragraph came in T2 (R9). The wording says "a view that fills the window", not "full screen".
6. The viewer has ten test rows, not nine. The added row: `viewer: a drag pans, and the scroll bar does not` (R11). Update the count in `docs/architecture/md-view.spec.md`.
7. Decision changed during the build: the dialog size is `width: 100%; height: 100%`, not `100vw` and `100vh`. A modal dialog sits under the page scroll bar with `100vw`. The spec Size row now says it. Update the architecture spec the same way.
8. Decision changed during the build: the close row calls `d.close()` and then dispatches a synthetic `close` event, because Chrome does not deliver the native event in the headless dump (R16). A mutant without the listener fails the row.
9. The Close button has `autofocus`, so Enter or Space at open closes the viewer. A drag starts only inside the box without its scroll bars, and `.md-vbox` has `user-select: none`.

## Parked findings

- show() has no row that proves it closes the viewer (back button on the tree page). Low risk; the awk check of the plan covers the first line.
- Print while the viewer is open prints the dialog, not the page. Add to the owner manual check. A `beforeprint` listener that calls `closeViewer()` would fix it.
- `openViewer` sets state before it reads the `viewBox`; a guard is one line.
- The close row does not check the place of the svg before the bar.
- No test for the point under the pointer on wheel zoom, and none for the clamp.
- Two pointer listeners (`pointerup`, `pointercancel`) could be one `lostpointercapture` listener. Kept, because a synthetic pointer gets no capture.
- `setPointerCapture` throws for a synthetic pointer id (tests only); the `md-drag` class is not reached in the test.
- Wheel `deltaMode` 2 (page) is not handled.
- Owner manual check, open: Chrome, Firefox and Safari; wheel zoom at the pointer; pinch; a real mouse drag and whether it selects label text; the bar on hover; Esc and the focus after close; labels at 1:1 look like the page; print while the viewer is open.

## Lessons

- The plan said the T2 done check count is 8; a fix round added a row. A done check that counts rows breaks when a review adds one. Write the count as "at least".
- A plan must name every existing test that pins a line it changes (`browser-page.sh` pins the print line, the page script and the keydown listener count). T1 and T2 each met one of them late.
- Close-out: update `docs/architecture/md-view.spec.md` (section "How diagrams render", page part table, ten new rows, the Size row, the Keys row) and the invariants if wanted.

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| task-reviewer-critical | opus | 2 | 0 | 1 | 9 |
| re-reviewer | haiku | 2 | 0 | 0 | 0 |
| final-reviewer | opus | 1 | 0 | 1 | 5 |
