---
description: The exact contract of the mermaid-viewer story. A button bar on each drawn diagram opens a full-screen dialog with zoom, Fit, 1 to 1 and drag to pan.
---

# Spec: mermaid-viewer

All code is in `lib/page.js` and `lib/page.css`. The print rules are in the two print heredocs of `lib/md-view`.

## Button bar

| Item | Rule |
|---|---|
| When | After `mermaid.run` settles in `drawDiagrams` (also after its `.catch`), and the batch is not cancelled. Each `pre` of the batch that holds an `<svg>` gets one bar. A `pre` that shows its source (parse error, draw error, time limit) gets no bar. |
| Markup | `<div class="md-dbar">` as the last child of the `pre`, with one button. The button is made with `makeButton('⤢', …)`. It has `aria-label` and `title` `Expand diagram`. |
| Place | Top-right corner of the `pre`. `pre.mermaid[data-processed]` gets `position: relative`. |
| Shows | `opacity: 0`. `opacity: 1` on `pre.mermaid:hover` and on `.md-dbar:focus-within`. Always `opacity: 1` under `@media (hover: none)`. |
| Print | Both print rules of `lib/md-view` (tree page and one-file page) add `.md-dbar` to the list that gets `display: none !important`. |
| Cursor | `pre.mermaid[data-processed] > svg` has `cursor: zoom-in`. |

## Open

| Call | Result |
|---|---|
| Click on the Expand button | `openViewer(pre)`. |
| Click on the `<svg>` of a `pre` that has a bar, or on an element inside that `<svg>` | Walk `parentNode` from `e.target`, as the link listener of `wireControls` does. Then `openViewer(pre)`, unless `String(window.getSelection())` is not empty. One `click` listener on `#content` does this. It is added once. |
| `openViewer(pre)` | Does nothing if the viewer is open or `pre` holds no `<svg>`. Else it saves `pre`, the `<svg>` and the `style` attribute of the `<svg>` (or `null`). It moves the `<svg>` into the scroll box, with no clone. It calls `showModal()`, and then sets Fit. |
| Window narrower than 700 px | The bar and the viewer work. No rule hides them. |

## Viewer

| Item | Rule |
|---|---|
| Markup | One `<dialog class="md-viewer" aria-label="Diagram viewer">` on `body`, made at the first open and kept. It holds `<div class="md-vtools">` (the buttons) and then `<div class="md-vbox">` (the scroll box). |
| Size | The dialog fills the window: `width: 100%; height: 100%; max-width: none; max-height: none; margin: 0; padding: 0; border: 0`. With `[open]`, it is a flex column. The scroll box takes the rest (`flex: 1; overflow: auto; display: flex`). The `<svg>` has `margin: auto` and `flex: none`. |
| Label font | At open, the scroll box gets the computed `font-family`, `font-size` and `line-height` of the `pre`, as inline style. |
| Colors | `background: Canvas; color: CanvasText`. `::backdrop` is `rgba(0,0,0,0.5)` in all palettes, because the dialog fills the window and the backdrop does not show. Rules that start with `html[data-palette]` set `var(--p-bg)` and `var(--p-fg)` on the dialog, and `var(--p-bg-hl)`, `var(--p-fg)` and `var(--p-border)` on its buttons. |
| Buttons | In this order, made with `makeButton`: `−` (`Zoom out`), `+` (`Zoom in`), `Fit` (`Fit`), `1:1` (`Actual size`), `×` (`Close`). The text in brackets is `aria-label` and `title`. |

## Zoom

| Call | Result |
|---|---|
| Full size | `w0 = svg.viewBox.baseVal.width`, `h0 = svg.viewBox.baseVal.height`, read at open. |
| `setZoom(k, x, y)` | Clamps `k` to the range 0.05 to 20. Sets `svg.style.width = w0*k + 'px'`, `svg.style.height = h0*k + 'px'` and `svg.style.maxWidth = 'none'`. Keeps the point at box position (`x`, `y`) under the same box position. With no `x` and `y`, it keeps the box center. |
| Fit | `k = min(box.clientWidth / w0, box.clientHeight / h0)`. No cap at 1. The viewer always opens in Fit. |
| `+` button, key `+` or `=` | `k × 1.25` |
| `−` button, key `-` | `k / 1.25` |
| `Fit` button, key `0` | Fit |
| `1:1` button, key `1` | `k = 1`. The `<svg>` width is `w0` px. |
| Wheel on the scroll box | `preventDefault()`. `k × 1.25^(−dy/100)`, around the pointer. `dy` is `deltaY`, times 33 when `deltaMode` is 1. Ctrl+wheel is the same. The listener has `passive: false`. |
| Mouse or pen drag on the scroll box | `pointerType` is not `touch` and `button` is 0. `setPointerCapture`, then each move changes `scrollLeft` and `scrollTop` by the move. The box has `cursor: grab`, and class `md-drag` (`cursor: grabbing`) while the drag runs. |
| Touch drag | Native scroll. The code does not handle it. |
| Window resize | `k` does not change. |

## Close

| Call | Result |
|---|---|
| `×` button, Esc, `dialog.close()` | The dialog `close` event calls `closeViewer()`. |
| `closeViewer()` | Does nothing if no `<svg>` is saved. Case 1: the bar node saved at the open (`view.bar`) is still a child of the saved `pre`, and the `pre` is in the document. (`redraw` and `showCode` empty the `pre`, so the old bar is gone after them. A new drawing gets a new bar node. So the saved bar marks a `pre` that is the same as at the open.) It puts the `<svg>` back before the bar. It sets the saved `style` attribute again, or removes it when the saved value is `null`. Case 2, all other cases: it drops the `<svg>`. It clears the saved values, and closes the dialog if it is open. |
| `show()` and `redraw()` | Call `closeViewer()` first. A palette or theme change while the viewer is open closes it, and then the diagrams draw again. |
| Focus | The browser puts the focus back on the element that had it before `showModal()`. |

## Keys

| Call | Result |
|---|---|
| Page `keydown` handler, viewer open | Returns at once. `t s w b ?` and its Esc do nothing. |
| `keydown` on the dialog | `+`, `=`, `-`, `0`, `1` as in Zoom. Ctrl, Alt and Meta keys are not used. |

## Tests (`tests/hostile-dom.sh`)

Each row uses `tests/fixtures/broken-diagram.md` (one failed, one drawn diagram), adds a script to the page, and reads the result from `document.title`. Each row except `viewer: print hides the bar` is a `net_check` row, so it skips with no network. The print row needs no browser and uses `check`.

| Row label | Proves |
|---|---|
| `viewer: one bar on the drawn diagram` | One `.md-dbar` in the page, and none in the failed block. |
| `viewer: Expand opens the dialog in Fit` | The dialog is open and modal. The `<svg>` is in the dialog and not in the `pre`. The page has one `<svg>` with its id. Its box is no wider and no higher than the scroll box. |
| `viewer: close puts the svg back` | After `×`, the dialog is closed, the `<svg>` is in its `pre`, and its `style` attribute is the same as before the open. |
| `viewer: a click on the diagram opens it` | A click on an element inside the `<svg>` (`svg.querySelector('g')`) opens the dialog. With a text selection, the same click does not. |
| `viewer: opens in a 600 px window` | Chrome with `--window-size=600,800`: Expand opens the dialog. |
| `viewer: print hides the bar` | The print rule of the one-file page and of the tree page holds `.md-dbar`. |
| `viewer: zoom keys, buttons and wheel` | `1` gives width `w0`. `+` gives `w0 × 1.25`. `-` gives `w0`. The `+` button gives `w0 × 1.25`. A wheel event with `deltaY: 100` gives `w0`. The `−` button gives `w0 / 1.25`. The `1:1` button gives `w0`. The `Fit` button and then `0` give a size inside the box. |
| `viewer: page keys do nothing while open` | `t` and `w` sent to the dialog do not change `data-theme` or `data-width`. |
| `viewer: a palette change closes the viewer` | A page with `--theme dark`. With the viewer open, a click on the `tokyo` button of the popover closes the dialog. The diagram draws again with `#292e42`. The dialog holds no `<svg>`, and the page has one diagram `<svg>`. |

## Done

`make check` exits 0 with no `FAIL` line, and each row above prints `ok` (not `skip`). All rows of `tests/hostile-dom.sh` that were there before still pass. The PR lists the `skip` lines of `make check`. The PR lists the manual check as open for the owner. It covers Chrome, Firefox and Safari: wheel zoom at the pointer, pinch, drag, the bar on hover, Esc and the focus after close. It also checks that the labels at 1:1 look the same as in the page.

At close-out, the main session updates `docs/architecture/md-view.spec.md`. It changes the section "How diagrams render" and the page part table (`.md-dbar`, `dialog.md-viewer`, the viewer keys). It adds the nine new rows to the test table.

## Out of scope

- Zoom in the page, and an in-page 1:1 toggle.
- A third-party pan and zoom library.
- Safari trackpad pinch (gesture events).
- Saved zoom between two opens. A zoom percent label.
- Any change to the CSP meta, `securityLevel:'strict'`, `MERMAID_URL` or `MERMAID_SRI`.
