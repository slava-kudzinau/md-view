---
description: Makes the file tree panel readable in a narrow width: depth rails, chevrons, one row per folder chain, ellipsized names, and a resizable saved width.
status: planned
size: M
risk: contract
---

# tree-panel-compact-resize

## Goal

Deep hierarchies are hard to read in the tree panel. Today the 260 px panel shows folders with a native triangle and a flat 12 px indent. Depth reads only from the triangle column, and long names wrap into two lines. The panel gets visible depth: a guide rail per level, a chevron, and bold folders. A folder chain takes one row. Long names end with an ellipsis. The reader can drag the panel wider, and the page keeps the width.

## Context

Mock page `mocks/tree-panel-options.html` (cards B, C and E; owner picked "C with re-sizing", 2026-11-18). Spec rows Panel, Toggle, Saved state, Width, Narrow window, Print, `docs/architecture/md-view.spec.md:122-129`, Saved choice `:145`. Tree CSS `lib/md-view:967-999`. Panel markup `lib/md-view:1013-1016`. Tree build `buildTree` `lib/page.js:272-321`, open-state `markTree` `lib/page.js:323-342`, storage helpers `lib/page.js:615-623`, reset `resetChoice` `lib/page.js:1265-1269`, init order `lib/page.js:796-798`.

## Scope

**In.**

- **CSS** in the tree block `lib/md-view:967-999`. The panel width becomes `var(--md-panel-w, 300px)`; `body` padding becomes `calc(var(--md-panel-w, 300px) + 16px)`; the toggle left becomes `calc(var(--md-panel-w, 300px) + 8px)` (308 px by default). Every nested folder box gets a rail: `#md-tree-panel details > div` gains `margin-left`, `padding-left` and a 1 px `border-left` (base color `GrayText`). `summary` gets `list-style: none`, the webkit marker off, a `::before` chevron that rotates when open, `font-weight: 500`, and ellipsis (`white-space: nowrap`, `overflow: hidden`, `text-overflow: ellipsis`). File links get the same ellipsis and a left padding that aligns them under the folder name. `.md-root` becomes sticky at the top with `background: inherit`. A new grip rule: `#md-tree-resize` is fixed, full height, 6 px wide, at `left: calc(var(--md-panel-w, 300px) - 3px)`, `cursor: col-resize`, `touch-action: none`. The narrow block keeps the two pinned lines verbatim (`tests/browser-page.sh:2695,2697`). It gains `#md-tree-resize { display: none }`. The print rule keeps its pinned line (`tests/browser-page.sh:2684`). It gains a second `@media print` line for the grip. The palette layer gains one color-only rule `html[data-palette] #md-tree-panel details > div { border-color: var(--p-border) }` and one row in the layer table `tests/browser-page.sh:2815-2819`.
- **Markup** in `lib/md-view:1013-1016`: after the nav, one `<div id="md-tree-resize" role="separator" aria-orientation="vertical" aria-label="Resize the file tree" tabindex="0"></div>`. It is a sibling of the nav, so the panel's `overflow: auto` cannot clip it.
- **Chains** in `buildTree` (`lib/page.js:286-315`): one pre-pass over `order` counts the children of each folder. A folder whose only child is one folder joins that folder into one `<details>`. The summary holds the chain of decoded names. Each name is separated by a `<span class="md-sep">` with the text `›`. The names go in with `textContent`, as today. The chain's files and subfolders land in the one shared box. A folder with a file sibling stops the chain. `sub` (one file) stays a plain `sub` row. `treeFolders` registers every key of the chain on the same element, so `markTree` opens it.
- **Resize** in `lib/page.js`: new constants `KEY_PANEL = 'md-view-tree-w'`, `PANEL_MIN = 200`, `PANEL_MAX = 560`, start 300. `applyPanelWidth(px, keep)` clamps to 200..560 and to half the window. It sets `--md-panel-w` on `root.style`, updates `aria-valuenow`, and saves with the existing `save` wrapper. `loadPanelWidth()` reads the key through `storageGet` and accepts `^[0-9]{1,4}$` only. Init applies it in tree mode before `buildTree()` (`lib/page.js:796`). `wireResize()` runs from `wireControls`. It wires pointerdown, pointermove and pointerup with pointer capture on the grip. `treeResize.onkeydown = function (e)` handles ArrowLeft and ArrowRight: step 16 px, Shift 64 px. That is an assignment, not a third listener kind, so the pinned keydown count stays 1 (`tests/browser-page.sh:899,2646`). Double-click resets to 300. A `resize` listener re-clamps the current width with `keep` false. `resetChoice` removes `KEY_PANEL` and applies 300.
- **Spec** `docs/architecture/md-view.spec.md`: the Panel row names rails, chevron, chain rows and ellipsis. The Toggle row names the grip and its keys. The Saved state row adds `md-view-tree-w`. The Width row says 300 px, the clamp 200..560, and half the window. The Narrow window row adds the grip. The Print row adds the grip. Saved choice (`:145`) lists the new key. The Tests table gains the chain and resize rows.
- **README** `README.md`: the tree paragraph says the panel is resizable (drag, arrows, double-click) and that a single-child folder chain shows on one row.
- **Tests** `tests/browser-links-dom.sh`: geometry constants move 292→332, 276→316, 268→308 (`:756-757,787`). The nested-folder row changes. The fixture `deep/a/d.md` renders one chain summary `deep › a`. `sub` stays `<summary>sub</summary>`. New rows: at least 4. A chain with a file sibling stops at that folder. `ArrowRight` on the grip sets 316 in `--md-panel-w` and in `localStorage`. The row gates on `style.getPropertyValue` and the storage key, not on painted svg. Shift adds 64. Double-click restores 300. A seeded `md-view-tree-w` loads at that width (reuse the seed-reload pattern of the palette test). `tests/browser-page.sh`: the narrow case gains the grip line. The print case gains a grip line. The storage case (`case_page_storage_try_catch`) gains `md-view-tree-w` in the key list. The layer table gains the rails row.

**Out.** A breadcrumb row for the current path (mock card D; future story). A collapse-all button. Auto-width from content. `title` tooltips on names (they break the pinned anchor markup). Per-level indent beyond the rail model.

## Size

M: about 60 lines of CSS edits and two rules, and one markup line. About 90 lines go in `lib/page.js`: the chain pre-pass and the resize. About 8 new test rows plus the moved constants. One spec row set and one README sentence. No new files. Hard stop L.

## Unknowns

- The serialized form of a chain summary under `--dump-dom` (span nesting and order). First task: dump one chain fixture and pin the exact string.
- Synthetic `PointerEvent` drag through `setPointerCapture` in headless Chrome is unmeasured. The drag row gates on the CSS variable and the storage key after the event sequence. If capture proves flaky, the keyboard rows carry the feature. One drag row stays best-effort.
- Chevron glyph rotation at 13 px: the first screenshot pass picks the glyph (`›` + rotate) that reads crisp in both palettes.

## Acceptance criteria

- The root has `deep/a/d.md` and `sub/a.md`. The panel shows one `<details>` whose summary reads `deep › a`. It contains the link to `d.md`. `sub` shows a plain summary `sub`.
- Opening `#/deep/a/d.md` opens the chain row (one `details` for the whole chain).
- At the default, the panel is 300 px wide: the toggle left is 308, and the content column uses the 332 px gutter arithmetic.
- `ArrowRight` on the focused grip sets `--md-panel-w` to 316 px on `html`. It saves `md-view-tree-w=316`. Shift adds 64. Successive presses clamp at 560. Double-click restores 300 and saves it.
- A page that loads with `md-view-tree-w=400` in storage opens at 400 px; a garbage value opens at 300; Reset restores 300 and removes the key.
- Below 700 px the panel, the toggle and the grip are hidden. Print hides the grip too.
- `make check` is green (read the `skip` lines), the keydown listener count is 1, and the palette layer check accepts the rails row.
- Close-out: the spec rows Panel, Toggle, Saved state, Width, Narrow window, Print and Saved choice are in step, and so is the Tests table. `README.md` is in step. `check_ste.py` is clean on every touched page.

## Notes

- Owner decisions (2026-11-18/19): pick mock C with resize. C is compact chains, rails, chevron and ellipsis. Default 300 px; clamp 200..560 px. Keyboard step 16 px, Shift 64 px. Double-click resets. One story M. Design playback approved 2026-11-19.
- Branch `feat/tree-panel-compact-resize`, base `main`. It shares `lib/page.js`, `lib/md-view` and `tests/browser-page.sh` with `mermaid-accent-toolbar` (planned) in non-overlapping regions; they can run in parallel.
- Budget M ($15, hard stop $20). Check: `make check`; the DOM rows need Chrome (`skip` lines otherwise). Owner-checked paths: the nine vendored `lib/` files (no change here).
- flow tier=full docs=spec,plan design=no orchestrator=yes final=final-reviewer gate=stop scan=yes verifier=none. Gate: the owner reads gate.md before the build (risk flag contract).
- Risk notes: `contract` — the Panel, Width, Saved state and Saved choice rows change meaning, and `md-view-tree-w` joins the saved-key set; every old input keeps working.
- The plan must name the tests it changes. `tests/browser-page.sh` pins the two print/narrow lines, the keydown listener count, and the palette layer rows. `tests/browser-links-dom.sh` pins the geometry constants and the two summary rows.
- started: 2026-11-18T23:18:39Z. BASE: 6f71909 (main == origin/main). Worktree `.worktrees/tree-panel-compact-resize`, branch `feat/tree-panel-compact-resize`.
- Hooks: preflight none; verify `make check`; status none; cleanup none.
