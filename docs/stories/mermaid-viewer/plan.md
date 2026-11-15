---
description: The task plan of the mermaid-viewer story. Three tasks add the button bar and the viewer, then zoom and pan, then the close on redraw and the README.
---

# Plan: mermaid-viewer

Spec: `spec.md` (governs exact values: class names, labels, zoom step and range, test row labels). This story has no design doc. The plan carries the design.

## Global Constraints

- Change only `lib/page.js`, `lib/page.css`, the two print heredocs in `lib/md-view`, `tests/hostile-dom.sh` and `README.md`. Owner-checked paths: `lib/` except `lib/md-view`, `lib/page.js` and `lib/page.css`; `LICENSE`; `AGENTS.md`; `docs/architecture/`. The main session changes `docs/architecture/` at close-out. (story.md Notes)
- Read `spec.md` before each task and follow it exactly. It settles these choices:
  - the label font that the box copies at open (Viewer, Label font);
  - the Fit math, and the start in Fit (Zoom);
  - `setZoom`, with the range clamp inside it and `x`, `y` relative to the box (Zoom);
  - the pan with `scrollLeft`, `scrollTop` and `setPointerCapture` (Zoom);
  - the wheel `deltaMode` and ctrl+wheel (Zoom);
  - Esc by the native dialog `cancel`, and the `close` event (Close);
  - the focus, and what `closeViewer()` restores (Close).
- `view.style` holds the `style` attribute of the `<svg>` before the open, or `null`. `closeViewer()` sets it back, so the zoom width, height and `max-width` go away. `addBar` runs only after `mermaid.run` resolves, so each `<svg>` that gets a bar has its `viewBox`. If `viewBox.baseVal.width` or `.height` is 0 at open, `openViewer` uses `svg.getBoundingClientRect()` for `w0` and `h0`.
- Write POSIX `sh` only in tests. Add no new tool, package or library. The page script stays ES5 in form, as now: `var`, `function`, no arrow functions, no classes. (AGENTS.md, global policies; owner ruling "no third-party library")
- Do not change the CSP meta, `securityLevel:'strict'`, `MERMAID_URL` or `MERMAID_SRI`. Do not change or remove a row of `tests/hostile-dom.sh` that is there now. (AGENTS.md; invariant `[browser]`)
- Make all page elements with `createElement`, `makeButton` and `textContent`. Never set `innerHTML` with a string that holds text from the Markdown file. (AGENTS.md, untrusted input)
- Move the `<svg>` with `appendChild` or `insertBefore`. Never clone it: its `<style>` and markers use ids. (story.md Context)
- Read the full size from `svg.viewBox.baseVal` only after `mermaid.run` resolves. A probe on 2026-11-15 found that the first `<svg>` in a `pre` can have no `viewBox` while mermaid still works. So a test must wait for `.md-dbar`, not for the first `<svg>`. Use `WHEN_BAR` (T1) in the new rows, not `WHEN_DRAWN`.
- A probe on 2026-11-15 found that `showModal()`, `dialog.close()` and the move of the `<svg>` work in `--headless=new --dump-dom --virtual-time-budget=5000`. A synthetic Escape `KeyboardEvent` does not close a native dialog, so a test closes with the `×` button.
- Do not add a `skip` rule to pass a row. A new row uses `net_check`, as the other diagram rows do. (AGENTS.md, tests)
- Comments: one short comment above each new function. Update the comments of `drawDiagrams`, `redraw`, `show` and the page `keydown` handler when you change them. (user rules)
- Commit message: a short imperative summary line, a blank line, an optional body, a blank line, then the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Use this trailer exactly, whatever model you are. One commit for each task.
- Check: `make check`. Read the `skip` lines before you trust a pass. The new rows must print `ok`, not `skip`.

## T1: Button bar, open and close

**Depends on:** none
**Done check:** `make check` exits 0, and `sh tests/hostile-dom.sh | grep -c '^ok viewer:'` prints `6`.
**Role:** implementer — review task-reviewer-critical (a public contract: new page parts; the untrusted-input rule)

1. Write the six T1 rows of the spec Tests table in `tests/hostile-dom.sh` first, after the row `palette: mermaid redraw`. Run them and see them fail.
   - Add `WHEN_BAR`, `WHEN_BAR_END`, the same as `WHEN_DRAWN` but the test is `document.querySelector('.md-dbar')`.
   - Add `viewer_page <name> <script|-> <args...>`, the same as `palette_page` but with `$fix/broken-diagram.md`.
   - Give `render` an optional third argument: a window size such as `600,800`. When it is set, add `--window-size=$3`. The calls that are there now do not change.
   - Each row sets `document.title` to one word list, for example `bars=1 failed=0`, and greps the dump for the exact `<title>`.
   - The click row: make a selection with `getSelection().selectAllChildren(document.querySelector('h1'))`, send `new MouseEvent('click',{bubbles:true})` to the `<svg>`, and read `dialog.open`. Then call `removeAllRanges()`, send the click again and read it again.
   - The print row: write the page with `--tree off` and with `--tree on`, and grep the `@media print` line of each for `.md-dbar`. It needs no Chrome, but it is in this file with the other viewer rows. Use `check`, not `net_check`, for it.
2. In `lib/page.js`, add `addBar(pre)`, `openViewer(pre)`, `closeViewer()`, `buildViewer()` and `fitZoom()`. Keep the viewer state in one object `view = { dlg, box, pre, svg, style, w0, h0, k }`, made by `buildViewer()` at the first open.
3. In `drawDiagrams`, wait for `mermaid.run` to resolve. If `batch.cancelled` is false, call `addBar(it.pre)` for each `it` of `good` whose `pre` holds an `<svg>`.
4. In `wireControls`, add one `click` listener on `#content`. It opens the viewer for a click on the `<svg>` of a `pre` that has a bar (spec, Open).
5. In `lib/page.css`, add the rules of the spec (bar, cursor, dialog, box, backdrop, palette colors). Put the palette rules next to the other `html[data-palette]` rules.
6. In `lib/md-view`, add `.md-dbar` to both `@media print` heredoc lines.

## T2: Zoom, pan and keys

**Depends on:** T1
**Done check:** `make check` exits 0, and `sh tests/hostile-dom.sh | grep -c '^ok viewer:'` prints `8`.
**Role:** implementer — review task-reviewer

1. Write the rows `viewer: zoom keys, buttons and wheel` and `viewer: page keys do nothing while open` first. Run them and see them fail.
   - Send keys as `new KeyboardEvent('keydown',{key:'+',bubbles:true})` to the dialog.
   - Send the wheel as `new WheelEvent('wheel',{deltaY:100,clientX:..,clientY:..,bubbles:true,cancelable:true})` to the scroll box, with the point at the box center.
   - Compare widths with `Math.abs(a-b) < 0.5`.
2. Add `setZoom(k, x, y)` (spec, Zoom) and the five buttons. Fit uses `setZoom`.
3. Add the `keydown` listener on the dialog and the `wheel` listener on the box (`{ passive: false }`). Add the pointer drag (`pointerdown`, `pointermove`, `pointerup`, `pointercancel`).
4. Add the guard at the top of the page `keydown` handler: return when the viewer is open.

## T3: Close on redraw, and the README

**Depends on:** T2
**Done check:** `make check` exits 0, `sh tests/hostile-dom.sh | grep -c '^ok viewer:'` prints `9`, and `grep -c 'Expand' README.md` prints a number above 0.
**Role:** implementer — review task-reviewer

1. Write the row `viewer: a palette change closes the viewer` first. Run it and see it fail. Use `--theme dark` and click the `tokyo` button in `#md-pop` with `.click()` (the popover can be hidden). Then wait for a new `.md-dbar` and for `#292e42` in the `pre`, as the row `palette: mermaid redraw` does.
2. Call `closeViewer()` as the first line of `redraw()` and of `show()`. Update their comments.
3. In `README.md`, after the paragraph about the page keys in Usage, add one paragraph. It says: a drawn diagram has an Expand button in its top-right corner. A click on the diagram does the same. The viewer fills the window and opens in Fit. The wheel zooms at the pointer. A drag moves the diagram. The keys are `+` and `-` (zoom), `0` (Fit), `1` (actual size) and Esc (close). Write it in ASD-STE100.
