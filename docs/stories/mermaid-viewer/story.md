---
description: Add a full-screen viewer for mermaid diagrams, with zoom, fit, 1 to 1 and drag to pan, so that a big diagram is easy to read without browser zoom.
status: planned
size: M
risk: contract
depends-on:
  - page-assets
refs:
  - docs/architecture/md-view.spec.md
  - docs/architecture/md-view.invariants.md
---

# Story: mermaid-viewer

## Goal

Mermaid shrinks each diagram to the text column, which is about 980 px wide. A big diagram, for example a 35-line `flowchart LR`, then has text that is too small to read. Today the reader must use browser zoom on the whole page. This story adds a full-screen viewer. The reader opens a diagram, zooms it and drags it. The page itself never zooms, so the mouse wheel always scrolls the page.

## Context

- Mermaid 12.3.0 runs with no diagram config, so each type uses `useMaxWidth: true`. Each drawn SVG has `width="100%"`, an inline `max-width: Npx` and a `viewBox`. The `viewBox` width is the same as the max-width. This was measured on six types (flowchart, sequence, class, state, gantt, pie).
- The SVG has a `<style>` whose selectors all start with `#mermaid-<id>`, and markers with `url(#<id>_...)`. A move of the node in the same document keeps them. A clone would make duplicate ids.
- `drawDiagrams` calls `mermaid.run` for the good diagrams. `redraw` sets `pre.textContent` to the source and draws again. `showCode` and `show` also empty the `pre` or the content. The line numbers are in `lib/page.js` after the page-assets story.
- The page keys (`t s w b ?` and Esc for the popover) are in one `keydown` handler. It does not check for a dialog.
- `makeButton(text, onClick)` builds a button with `createElement` and `textContent`. Print rules hide the gear and the popover. Palette colors are in rules that start with `html[data-palette]`.
- The CSP (`default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data: file:`) allows all of this with no change.

## Scope

**In:**

| Part | Rule |
|---|---|
| Button bar | After `mermaid.run`, each `pre.mermaid` that holds an SVG gets a small bar in its top-right corner, with an Expand button. The bar shows on hover and on keyboard focus. With `@media (hover: none)` it always shows. Print hides it. A diagram that failed and shows its source gets no bar. |
| Open | A click on Expand opens the viewer. A click on the diagram opens it too (cursor `zoom-in`), except a click that ends a text selection. |
| Viewer | One `<dialog>` on `body`, opened with `showModal()`. The SVG moves into a scroll box in the dialog. It is not cloned. The dialog has its own background and backdrop, and the palette layer colors them. |
| Size | The full size comes from `svg.viewBox.baseVal`. Zoom k sets `style.width` and `style.height` to full size × k and sets `max-width` to `none`. Fit is k = min(box width / full width, box height / full height), with no cap. The viewer always opens in Fit. |
| Controls | Buttons − + Fit 1:1 ×. Keys `+`, `-`, `0` (Fit), `1` (1:1), Esc (close). The wheel zooms around the pointer. Ctrl+wheel (trackpad pinch in Chrome and Firefox) does the same. A mouse or pen drag pans with `scrollLeft` and `scrollTop` (cursor `grab`, then `grabbing`). A touch drag uses native scroll. |
| Close | One function, `closeViewer()`, moves the SVG back into its `pre` and puts back its old `style` attribute. If the `pre` is gone or holds a new SVG, it drops the old one. `redraw` and `show` call it first. |
| Page keys | The page `keydown` handler ignores its keys while the viewer is open. |
| Docs and tests | The spec section "How diagrams render" and the page part table, the README usage, the test table in the spec. |

**Out:**

- Zoom inside the page, and an in-page 1:1 toggle. The owner chose "full-screen viewer only" on 2026-11-15.
- A third-party pan and zoom library. A library would save about 50 lines, but it adds a vendored file and changes the "add no new package" rule. It makes nothing faster.
- Safari trackpad pinch, which uses gesture events. It is a manual check. A later story can add it if needed.
- Saved zoom between two opens.
- Any change to the CSP meta, `securityLevel:'strict'`, the pinned mermaid script or its SRI hash.

## Size

M. The page script gets about 110 to 140 lines and the page style about 35 lines. Two existing functions get a hook, and the key handler gets one guard. The tests get two or three rows, and the spec and README change. One contract grows (new page part and keys). No new tool.

## Unknowns

1. **Headless test.** It is not known whether `showModal` works under `--dump-dom` with `--virtual-time-budget`. A scout also saw that with a frozen `Date.now`, mermaid gave the same id to several diagrams. The first task runs a short probe with `tests/fixtures/broken-diagram.md`. If the probe fails, the plan picks another way to drive the test before the build.
2. **Label layout after the move.** Out of `pre`, the SVG loses `line-height: 1.45`, `font-size: 85%` and the monospace font of `.markdown-body pre`. HTML labels in `foreignObject` can inherit these. A task compares the diagram in the page and in the viewer at 1:1. If the labels move, the scroll box sets the same values.
3. **Synthetic Esc.** A `KeyboardEvent` sent by a test does not close a native dialog. The test calls the close button or `dialog.close()`, and the manual check covers the real Esc key.

## Acceptance criteria

- Each drawn diagram has one button bar. A failed diagram has none. With `tests/fixtures/broken-diagram.md`, the page has exactly one bar.
- A click on Expand or on the diagram opens the dialog, and the SVG is in the dialog. A click that ends a text selection does not open it.
- In Fit, the SVG is no wider and no higher than the scroll box. At 1:1, its width is the `viewBox` width.
- `+`, `-`, `0`, `1` and the buttons change the size as stated. The page keys do nothing while the viewer is open.
- On close, the SVG is back in its `pre` with its old `style` attribute, and the page looks as it did before.
- A palette or theme change while the viewer is open closes the viewer, and then the diagrams redraw. No old SVG stays in the dialog or in the page.
- Print hides the bar. A window narrower than 700 px still opens the viewer.
- The CSP meta, `securityLevel:'strict'`, the SRI hash and all `tests/hostile-dom.sh` rows are unchanged and pass.
- New rows in `tests/hostile-dom.sh` add a script to a copy of the page, as the palette rows do. They prove the bar count, the open, Fit, and the move back. They skip with no network, as the other diagram rows do.
- Manual check in Chrome, Firefox and Safari: wheel zoom at the pointer, pinch, drag, the bar on hover, Esc, and the focus after close.
- The spec and the README describe the viewer and its keys. `make check` passes, and its `skip` lines are listed in the PR.

## Notes

- Owner request, 2026-11-15: "sometimes a mermaid diagram is big and it's hard to view it w/o zooming ... a (auto shown) control bar top right corner of the digram allowing to zoom in/out in place with scrolling + clicking on the diagram/tool bar action opening it on page fit with zoom in/out controlls there and ability to darg diagram with a hand pointer?"
- Owner rulings, 2026-11-15:
  - Approach: full-screen viewer only. There is no zoom in the page.
  - Open: the button and a single click on the diagram.
  - Fit: no cap. Fit always fills the box.
  - Reopen: always in Fit.
  - Dependencies: the owner said "if brining 3rd party dependencies simplify or speedup rendering/opening, let's bring them". The research found no speed gain and only a small saving, so the brief has no library. The owner approved the design with this choice.
  - "approved", for the design summary and the order page-assets then mermaid-viewer.
- Example of a big diagram: the first diagram of `mcp-gateway-blueprint.md` in the owner's mcp-gateway-v2 project, a 35-line `flowchart LR`.
- Builder's calls, which the owner can change: the button order, the icons, the zoom step (for example 1.25) and the zoom limits.
- Owner-checked paths: `lib/` except `lib/md-view`, `lib/page.js` and `lib/page.css`, `LICENSE`, `AGENTS.md`, `docs/architecture/`. The main session changes `docs/architecture/` at close-out.
- Branch `feat/mermaid-viewer` from `main` after page-assets merges. Worktree `.worktrees/mermaid-viewer`.
- Flow (from `flow-for.mjs --size M --risk contract`): tier full, docs spec and plan, orchestrator, final reviewer, gate stop, scan.
- Budget: $15. Hard stop: $20. Size M.
- Check: `make check`. A `skip all` pass proves only the tests that need no browser.
