# Plan: diagram-laser-pointer

Tier: lite (`flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none`). No `spec.md`: the spec is the section below.

## Spec

A laser pointer in the diagram viewer (fullscreen dialog). Full behavior contract: `story.md` Scope and Acceptance criteria. Exact values:

- Toolbar button in `.md-vtools`, text `●`, `aria-label`/`title` `Laser pointer`, `aria-pressed` `"false"` at creation, appended after `1:1`, before `×`. Click toggles the laser.
- Key: `l` and `L` toggle the laser when the viewer is open (keydown viewer branch). No new keydown listener.
- Dot: `div.md-laser`, child of `dialog.md-viewer` (appended last, after `.md-vbox`), `pointer-events: none`. Red 18 px radial-gradient dot; shown when the dialog has class `md-laser-on`. On toggle-on the dot sits at the box center until the first pointer move.
- Move: the existing `.md-vbox` `pointermove` listener updates the dot before its drag guard; coordinates are dialog-relative (`dlg.getBoundingClientRect()`): `left = clientX - r.left`, `top = clientY - r.top`, in `px`.
- State: `view.laser` boolean; survives close and reopen; not saved to `localStorage`. Pan-drag stays active while the laser is on.
- CSS: two new rules between the `.md-drag` and `.md-vbox > svg` rules of `lib/page.css`; `position: relative` added to `.md-viewer`.
- Docs: spec Keys row, Diagram viewer row, numbered viewer step 7, test-table viewer row. The Diagram viewer button list becomes `−`, `+`, `Fit`, `1:1`, `●`, `×`. The test-table count changes "ten" to "eleven", and the list gains "the laser" after "the drag". The README keys paragraph gains the `l` sentence.

### Done

`make check` exits 0, and in the viewer a `●` button and keys `l`/`L` toggle a red dot that follows the pointer over the diagram.

## Global Constraints

- POSIX `sh` in scripts; the page script style of `lib/page.js` (ES5: `var`, function declarations, existing `viewerButton` helper). No new tools or packages.
- Files this story may touch: `lib/page.js`, `lib/page.css`, `tests/hostile-dom.sh`, `docs/architecture/md-view.spec.md`, `README.md`, plus story-folder files.
- `tests/browser-page.sh` pins: one `document` keydown listener; the page-style head line count via `viewer_map` (sed range `.md-dbar { position: absolute` .. `.md-vbox > svg { flex: none; margin: auto }`). New CSS lines must land inside that range (between the `.md-drag` and `.md-vbox > svg` rules); do not widen the range.
- Exact names: `laser`, `dot`, `laserBtn` on the `view` object; function `toggleLaser`; classes `md-laser`, `md-laser-on`; test row name `viewer: laser dot`.
- Headless-Chrome rows gate on a paint: the dot's `display` is not `none` (computed style). Each observed tick rewrites the full success title. `viewer:` rows run on `WHEN_BAR`/`viewer_page`.
- Commit message: a short imperative summary line; optional body after a blank line; no trailer. One commit per task.
- Check: `make check`. Owner-checked paths: the nine vendored `lib/` files and their licenses; `docs/.templates/`.

## T1: page code — button, key, dot, move, CSS

**Depends on:** none
**Done check:** `sh tests/browser-page.sh` exits 0
**Role:** implementer — review final

Implement `story.md` Scope items "Toggle state", "Laser button", "toggleLaser", "Key", "Dot element", "Move", "CSS":

- `buildViewer` (`lib/page.js` ~921): create the `Laser pointer` button with `viewerButton('●', 'Laser pointer', toggleLaser)`, set `aria-pressed` to `"false"`, `tools.appendChild` it after the `1:1` block, before the `×` block. Create `div.md-laser`, append to `dlg` after `box`. Extend the `view` literal with `laser: false`, `dot`, `laserBtn`.
- `toggleLaser` (near `fitZoom`/`actualSize`): flip `view.laser`; toggle the dialog class; set `aria-pressed`. On toggle-on, center the dot at the visible box center, not the scrollable content's center. Set `left`/`top` from the box rect in dialog coordinates: `var r = view.dlg.getBoundingClientRect(); var br = view.box.getBoundingClientRect(); view.dot.style.left = (br.left + br.width / 2 - r.left) + 'px'; view.dot.style.top = (br.top + br.height / 2 - r.top) + 'px';`
- Keydown: in the `if (view && view.dlg.open)` branch, after the `1` case, `else if (e.key === 'l' || e.key === 'L') toggleLaser();`.
- Move: in the box `pointermove` listener, before the `if (!view.drag) return;` guard: `if (view.laser) { var r = view.dlg.getBoundingClientRect(); view.dot.style.left = (e.clientX - r.left) + 'px'; view.dot.style.top = (e.clientY - r.top) + 'px'; }`.
- CSS (`lib/page.css`): `.md-laser { display: none; position: absolute; z-index: 1; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(255,0,0,.95) 0, rgba(255,0,0,.5) 5px, rgba(255,0,0,.12) 12px); }` and `.md-viewer.md-laser-on .md-laser { display: block }`, inserted between the `.md-drag` and `.md-vbox > svg` rules; add `position: relative` to `.md-viewer`.

## T2: test row + docs

**Depends on:** T1
**Done check:** `sh tests/hostile-dom.sh` exits 0
**Role:** implementer — review final

- `tests/hostile-dom.sh`: add one `net_check "viewer: laser dot"` row after the drag row (`viewer: drag pans`, ~line 581), with `viewer_page laser ...` on `WHEN_BAR`/`WHEN_BAR_END`. The script clicks `.md-dbar button` to open the viewer, then clicks the `Laser pointer` button. It polls with a setTimeout loop, rewriting the full success title on each tick, until `getComputedStyle(document.querySelector('.md-laser')).display !== 'none'`. It asserts `aria-pressed` is `"true"` and the dialog has class `md-laser-on`. It dispatches `new PointerEvent('pointermove',{pointerId:1,pointerType:'mouse',clientX:X,clientY:Y,bubbles:true})` on `.md-vbox`, with X,Y a known point inside the box. It asserts the dot's inline `left`/`top` equal `X - dlgRect.left` and `Y - dlgRect.top` within 1 px. It dispatches `new KeyboardEvent('keydown',{key:'l',bubbles:true})` on the dialog. It asserts the computed `display` is `none` and `aria-pressed` is `"false"`. Key `'L'` turns it on again. The final title is `laser=all ok`, matching the existing `viewer:` row style (each check pushes 1/0 into `r`, joined).
- Row shape copies the adjacent drag row exactly: a `viewer_page laser "${WHEN_BAR}<script>$WHEN_BAR_END"` call and a `net_check "viewer: laser dot" laser_page` gate, same quoting and assembly.
- `docs/architecture/md-view.spec.md`: the Keys row (`:144`) viewer sentence adds `l` toggles the laser pointer (accept `l` and `L`). The Diagram viewer row (`:148`) button list becomes `−`, `+`, `Fit`, `1:1`, `●`, `×`. That row says the laser state survives close and reopen in the page session. Numbered step 7 (`:162`) adds two clauses on the dot: a red dot follows the pointer, and the dot anchors to the dialog. It also says key `l` toggles the laser, and the state keeps across close and reopen. The test-table viewer row (`:263`) count changes "ten" to "eleven". Its list gains "the laser" after "the drag". The row starts with the exact text `eleven \`viewer:\` rows: the bar, the open, Fit, zoom, the keys, the drag, the laser, the close and the close on redraw.`
- `README.md` keys paragraph (`:53`): add one sentence: in the diagram viewer, press `l` for the laser pointer.
- Run `make check` after the docs edits.
