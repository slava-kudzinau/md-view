# Plan: select label text in the diagram viewer with Shift

Tier: lite (`flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none`). No `spec.md`: the spec is the section below.

## Spec

In the diagram viewer (`.md-vbox`):

- Holding Shift sets class `md-shift` on the box; the cursor becomes `text`. Releasing Shift clears it. Closing the viewer clears it.
- A pointerdown with `shiftKey` sets class `md-select` and skips `setPointerCapture`. The native text selection then runs over the `<svg>`. The box computes `user-select: text` while the class is set.
- The pointerup, pointercancel and close paths remove `md-select`; a plain drag still pans.
- The in-text view keeps `cursor: zoom-in` on `pre.mermaid[data-processed] > svg`.

### Done

`make check` exits 0, and the headless dump of `tests/hostile-dom.sh` shows `<title>select=all ok</title>`.

## Global Constraints

- POSIX shell for the test rows; the page code stays plain browser JS and CSS. No new tools.
- CSS classes: `md-shift`, `md-select`; rules live in the viewer block of `lib/page.css` (inside the `viewer_map` delete range in `tests/browser-page.sh`).
- Listener counts pinned by `tests/browser-page.sh`: two `addEventListener('keydown'` and one `addEventListener('keyup'` in the page.
- Commit message: a short imperative summary line, a blank line, then the body. No trailer. One commit per task.
- Check: `make check`. Owner-checked paths: none.

## T1: page code for the select mode

**Depends on:** none
**Done check:** `grep -c -F "addEventListener('keyup'" lib/page.js` prints `1`
**Role:** implementer — review final

Three css rules after the laser rule (`.md-vbox.md-shift`, the laser-on override, `.md-vbox.md-select`). In `buildViewer`: the shift branch before `setPointerCapture`; two `dlg` key listeners for the Shift preview; `closeViewer` clears `md-shift`; `endDrag` clears `md-select`.

## T2: tests and docs

**Depends on:** T1
**Done check:** `sh tests/hostile-dom.sh` exits 0 (prints the `viewer: shift preview and select mode` row)
**Role:** implementer — review final

Update the pinned listener counts in `tests/browser-page.sh` (keydown 1 to 2, keyup allowed once, at lines 901-902 and 3018). Add `select_page` plus its `net_check` row after the last viewer row in `tests/hostile-dom.sh`; the title gate is `select=all ok`. Spec rows 164, 179 and 284 and README line 58 name the select mode.
