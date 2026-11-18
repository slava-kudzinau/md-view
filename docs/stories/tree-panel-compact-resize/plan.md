# Plan: tree-panel-compact-resize

Spec: `spec.md` (governs exact values). Design: none (the mock `mocks/tree-panel-options.html`, card C + resize, is the approved design).

## Global Constraints

- POSIX `sh` in `lib/md-view`; ES5 (`var`, `function`) in `lib/page.js`; no new tools.
- Pinned strings that must stay byte-for-byte in `lib/md-view`: `#md-tree-panel { position: fixed; top: 0; left: 0; bottom: 0; z-index: 10; box-sizing: border-box; width: var(--md-panel-w, 300px); padding: 6px 10px 8px; overflow: auto; border-right: 1px solid GrayText; background: Canvas; color: CanvasText; font: 13px/1.4 sans-serif }` replaces the old width/padding only (tests grep the `#md-tree-panel { position: fixed` prefix); `  html[data-panel] body { padding-left: 16px }`; `  #md-tree-panel, #md-tree-toggle { display: none }`; `@media print { #md-gear, #md-pop, #md-tree-panel, #md-tree-toggle, .md-dbar { display: none !important } }`; the toggle line; the nav line `<nav id="md-tree-panel" aria-label="File tree"></nav>`; the five `html[data-palette]` tree lines.
- Names: key `md-view-tree-w`; custom property `--md-panel-w`; constants `KEY_PANEL`/`PANEL_MIN=200`/`PANEL_MAX=560`/start 300; step 16 (Shift 64); grip id `md-tree-resize`; separator span class `md-sep` with text `›`.
- The document keeps exactly one `addEventListener('keydown'` string in `lib/page.js`; the grip uses `treeResize.onkeydown = function (e) {...}`.
- Geometry numbers move 292→332, 276→316, 268→308 in `tests/browser-links-dom.sh` (`:756-757`, `:787` and their comments).
- Commit message: a short imperative summary line, a blank line, then an optional body. No trailer. One commit per task.
- Check: `make check`. Owner-checked paths: the nine vendored `lib/` files (untouched here).
- Docs pages pass `check_ste.py` (ASD-STE100).

## T1: Panel CSS, grip markup, page-test pins

**Depends on:** none
**Done check:** `bash tests/browser-page.sh` exits 0
**Role:** implementer — review task-reviewer
Apply every CSS row and the grip markup line of `spec.md` to the tree block in `lib/md-view`. In `tests/browser-page.sh`: update the panel-width line of `case_page_tree_print_hidden` to `#md-tree-panel { position: fixed` (it pins the new rule head, keep the print line verbatim); keep the two narrow lines verbatim in `case_page_tree_narrow_rule`; add to `case_palette_layer` the row `'border-color: var(--p-border)' 'html[data-palette] #md-tree-panel details > div {'`; add `md-view-tree-w` to the key list of `case_page_storage_try_catch` (that case needs no new key line; the key appears in the page script, so no fixture change).

## T2: Chain rows in `buildTree`

**Depends on:** T1
**Done check:** `bash tests/browser-links-dom.sh` exits 0
**Role:** implementer — review task-reviewer-critical
In `lib/page.js` `buildTree`: precompute, over `order`, the set of folder keys, a child count per folder, and the only child per folder. Walk `order` as today; at a folder key with a single folder child, extend a chain while each next key is a folder with exactly one child, register every chain key's `<details>`/box in `treeFolders`/`boxes`, and emit one summary of names joined by `span.md-sep` (`textContent` parts: `name`, ` › `, `name`, ...). Everything else (links, `aria-current`, `markTree`) stays.
In `tests/browser-links-dom.sh`: move the geometry constants (Global Constraints); update the fixture `dom/a/d.md` to `dom/deep/a/d.md` in `case_dom_panel_tree` and pin one chain summary (`deep<span class="md-sep"` then `>›</span>a` then `</summary>`, plus `href=".*#/dom/deep/a/d\.md"`); pin `<summary>sub` unchanged; add `case_dom_panel_chain_stop`: fixture `forms/v.md` + `forms/fields/f.md` pins a `forms` summary with no `md-sep` and a `fields` chain inside (`fields</summary>` with the `f.md` link). `case_dom_panel_folders_open` keeps its shape: fixture `dom/x/y/z.md` pins one chain `x › y › z` opening (it opens the whole chain at `#/dom/x/y/z.md`).

## T3: Panel resize

**Depends on:** T2
**Done check:** `bash tests/browser-links-dom.sh` exits 0
**Role:** implementer — review task-reviewer-critical
In `lib/page.js`, after `treeOpen`/`setTree`: the constants of Global Constraints; a `panelW` value; `panelLimit()` = `Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.floor(window.innerWidth / 2)))`; `applyPanelWidth(w, keep)` clamps, stores, sets `--md-panel-w` on `root.style`, sets `aria-valuenow`, and calls `save(KEY_PANEL, ...)` when `keep`; `loadPanelWidth()` accepts only `^[0-9]{1,4}$`; `wireResize()` (called from `wireControls`, tree mode only) wires pointer drag on `#md-tree-resize` (`setPointerCapture`, moves update `applyPanelWidth(w,false)`, release calls it with `true`), `dblclick` to start-300-keep, and `treeResize.onkeydown` for `ArrowLeft`/`ArrowRight` (shift 64), all keep=true; a `window` `resize` listener re-applies with `keep=false`. `resetChoice` removes `KEY_PANEL` and applies 300 (`treeMode` guard). Init calls `applyPanelWidth(loadPanelWidth(), false)` before `buildTree`.
In `tests/browser-links-dom.sh` add three cases, registered like `dom_panel_width_rule` and using the `dom_dump` helper. `case_dom_panel_resize_key`: seed `md-view-tree-w=300`, `dom_focus` the grip, `send_key --key=ArrowRight`; gate on the `html` `style` attribute holding `--md-panel-w: 316px` and `aria-valuenow="316"`; print, assert it, and assert `localStorage.md-view-tree-w` is `316`; `send_key --key=ArrowRight --modifiers=8` then asserts 380. `case_dom_panel_resize_reset`: seed 300, drag the grip right by 60 px (the `mouse_drag` helper), assert 360, then double-click it (extend `mouse_click` with a `clickCount` argument, or send two clicks at one point); gate on `--md-panel-w: 300px`; assert localStorage `300`. `case_dom_panel_resize_seed`: seed `md-view-tree-w=420`, reload with the seed-reload pattern of `case_palette_select` (`:880`), gate on the painted panel width, assert 420; a second page seeds the garbage value `300px` and asserts width 300 with the store untouched. `case_dom_panel_width_rule` keeps its shape: its `overflow-wrap` grep moves to the `summary` rule, which now carries the drop.

## T4: Durable docs

**Depends on:** T2, T3
**Done check:** `python3 $P/kb/scripts/check_ste.py docs/architecture/md-view.spec.md README.md docs/stories/tree-panel-compact-resize/spec.md` exits 0, `$P` the fde-delivery plugin root
**Role:** implementer sonic — review final
Rewrite the Panel, Toggle, Saved state, Width, Narrow, Print rows and the Saved choice key list of `docs/architecture/md-view.spec.md` per `spec.md`; add chain and resize rows to its Tests table; extend the README tree paragraph (resizable panel, chain rows). Keep every pinned row string that the tests grep (Panel, Toggle, Print, Width, Narrow rows keep their leading words).

## T5: Integration proof

**Depends on:** T4
**Done check:** `make check` exits 0 (read `skip` lines)
**Role:** implementer sonic — review final
Run `make check` in full. Build a deep fixture (the mock's tree), open it headless at 1280 px, screenshot the panel at default, after one drag, and after Shift+ArrowRight; screenshots at light and dark palette; attach them to `closeout.md` "Run it". Commit any test flake fixes found.
