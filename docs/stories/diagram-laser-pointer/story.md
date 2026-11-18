---
description: Adds a laser pointer to the diagram viewer, a toolbar button and the key l that show a red dot following the pointer.
status: in-review
size: S
risk: none
---

# diagram-laser-pointer

## Goal

A presenter who points at a part of a fullscreen diagram needs a visible mark for the audience. The viewer gets a laser: a red dot that follows the pointer, toggled by a toolbar button and the key `l`.

## Context

Story `mermaid-viewer` (the viewer). Spec rows "Keys", "Diagram viewer" and numbered viewer step 7, `docs/architecture/md-view.spec.md:144,148,162`. Viewer code `buildViewer` `lib/page.js:921-969`, keydown viewer branch `lib/page.js:1200-1206`, viewer CSS block `lib/page.css:15-25`.

## Scope

**In.**

- **Toggle state** on the viewer object: the `view` literal in `buildViewer` (`lib/page.js:968`) gains `laser: false` plus fields `dot` and `laserBtn`. The viewer is built once, so the state survives close and reopen. Nothing is saved to `localStorage`.
- **Laser button** in the toolbar, built in `buildViewer` with the existing `viewerButton` helper (`lib/page.js:913`): text `●`, name `Laser pointer`, `aria-pressed` set to `"false"` at creation. Append it after the `1:1` button, before the `×` button (insert the `tools.appendChild(...)` call between `lib/page.js:930` and the close-button block at 931-934). A click calls `toggleLaser`.
- **`toggleLaser`** (a new function near the zoom functions, `lib/page.js:1046-1048`). It flips `view.laser` and toggles the dialog class `md-laser-on`. It sets `aria-pressed` on `view.laserBtn` to `'true'` or `'false'`. On toggle-on it centers the dot at the box center in dialog coordinates (from `view.dlg.getBoundingClientRect()` and `view.box.getBoundingClientRect()`). The dot then does not sit at the dialog corner before the first pointer move.
- **Key**: in the keydown viewer branch (`lib/page.js:1200-1206`, inside the `if (view && view.dlg.open)` block) add `else if (e.key === 'l' || e.key === 'L') toggleLaser();` after the `1` case. The existing single keydown listener stays the only one (pinned by `tests/browser-page.sh:899`).
- **Dot element**: in `buildViewer`, after `dlg.appendChild(box)` (`lib/page.js:938`), create `div.md-laser`, store it on `view.dot`, and append it to `dlg` last (it paints above the box). It uses `pointer-events: none`.
- **Move**: in the box `pointermove` listener (`lib/page.js:959-964`), at the top (before the `if (!view.drag) return;` guard), when `view.laser` is true set the dot position: `var r = view.dlg.getBoundingClientRect(); view.dot.style.left = (e.clientX - r.left) + 'px'; view.dot.style.top = (e.clientY - r.top) + 'px';`. Pointer capture during a drag keeps events flowing, so panning and the laser compose. A touch drag scrolls the box and moves the dot (touch `pointermove` fires).
- **CSS** in `lib/page.css`, inserted between line 24 (`.md-drag`) and line 25 (`.md-vbox > svg`). `viewer_map` in `tests/browser-page.sh:2393-2398` strips that range, so the head-line-count check at `tests/browser-page.sh:2415` needs no edit. The sed range runs from `.md-dbar { position: absolute` to `.md-vbox > svg { flex: none; margin: auto }`:
  - `.md-laser { display: none; position: absolute; width: 18px; height: 18px; margin: -9px 0 0 -9px; border-radius: 50%; pointer-events: none; background: radial-gradient(circle, rgba(255,0,0,.95) 0, rgba(255,0,0,.5) 5px, rgba(255,0,0,.12) 12px); }`
  - `.md-viewer.md-laser-on .md-laser { display: block }`
  - Add `position: relative` to the existing `.md-viewer` rule (`lib/page.css:19`, in range, so it is also absorbed).
- **Spec** `docs/architecture/md-view.spec.md`. The Keys row (`:144`) viewer sentence gains "`l` toggles the laser pointer"; it accepts `l` and `L`. The Diagram viewer row (`:148`) button list becomes `−`, `+`, `Fit`, `1:1`, `●`, `×`. That row notes that the laser state survives close and reopen in the page session. Numbered step 7 (`:162`) gains one sentence. It says: key `l` toggles the laser, the dot follows the pointer over the box, and the dot anchors to the dialog. The state keeps across close and reopen with no saved value. The test table viewer row (`:263`) count changes "ten `viewer:` rows" to "eleven `viewer:` rows". Its row list gains the laser, after the drag.
- **README** `README.md:53`: append one sentence to the keys paragraph: in the diagram viewer, press `l` for the laser pointer.
- **Test** in `tests/hostile-dom.sh`: one new `net_check "viewer: laser dot"` row after the zoom and drag rows (`:575-581`). It uses the `WHEN_BAR`/`viewer_page` harness (`tests/hostile-dom.sh:385-400`). The script opens the viewer (click `.md-dbar button`), then clicks the button with `aria-label="Laser pointer"`. It gates the title rewrite on the paint: the dot's `display` (computed style) is not `none`. It asserts `aria-pressed="true"` and the dialog class `md-laser-on`. It dispatches a `PointerEvent('pointermove', {clientX, clientY, bubbles:true})` on `.md-vbox` and asserts the dot's inline `left` and `top` (px, tolerance 1). They equal `clientX - dialogRect.left` and `clientY - dialogRect.top`. It dispatches `KeyboardEvent('keydown',{key:'l',bubbles:true})` on the dialog: `display` goes back to `none` and `aria-pressed` is `"false"`. Key `'L'` turns the laser on again. Rewrite the full success title on every observed tick.

**Out.** Page-level laser over text and inline diagrams (a future story: a gear-popover row plus a page `l` key). A laser button on the per-diagram bar `.md-dbar`. Laser persistence in `localStorage`. Laser and scheme picker interplay (story `mermaid-accent-toolbar`).

## Size

S: one button, one key case, one dot element, two CSS rules in an already-stripped style range, one spec row set, one test row. Hard stop M.

## Unknowns

None.

## Acceptance criteria

- Opening the viewer shows a `●` button in `.md-vtools` (after `1:1`, before `×`) with `aria-label="Laser pointer"` and `aria-pressed="false"`.
- Clicking it, and pressing `l` or `L` with the viewer open, toggles the dot. The dialog gets class `md-laser-on`, the dot is visible, and `aria-pressed` is in step.
- With the laser on, moving the pointer over the box moves the dot to the pointer position. A mouse drag still pans and the wheel still zooms.
- Toggling the laser on, closing the viewer and reopening it keeps the laser on; a reload resets it; `localStorage` gains no key.
- The new hostile-dom row `viewer: laser dot` passes; the existing ten `viewer:` rows pass unchanged.
- `sh tests/browser-page.sh` passes with `want one keydown listener` green and no change to `viewer_map` (proof the CSS lines sit in the stripped range).
- Close-out: the spec Keys row, the Diagram viewer row, and numbered step 7 are in step. The test-table count row and the README keys paragraph are in step. `check_ste.py` is clean on every touched page.

## Notes

- Owner decisions (2026-11-17): viewer-only scope; the fullscreen viewer is the presentation surface. Pan-drag stays active while the laser is on. The state is per page session, no `localStorage`.
- Branch `feat/diagram-laser-pointer`, base `main`. It runs in series with `mermaid-accent-toolbar` (both touch `.md-vtools` and the spec Keys row); this story goes first.
- Budget S (hard stop M). Check: `make check` (read the `skip` lines; a Chrome row proves the laser test).
- The dot is red at a fixed color (a laser is red); it is not palette-driven. A print while the viewer is open prints the dialog with the dot, covered by the existing manual print check.
- Budget $8, hard stop $10 (size S). Check: `make check`. Owner-checked paths: the nine vendored `lib/` files and their licenses; `.templates/`. Hooks: preflight none; verify `make check`; status none; cleanup none.
- started: 2026-11-17T09:55:00Z
- flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none
- G2-design: read later in the PR. Autonomous mode granted by owner, 2026-11-17: "go in autonomous mode, keep laptop on".
- BASE: 146dd90 (local main; the two story-brief commits are not pushed, so the worktree stacks on local main).
