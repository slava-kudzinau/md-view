# Plan: tree-panel-compact-resize

Spec: `spec.md` (governs exact values). Design: none. The approved design is the mock `mocks/tree-panel-options.html`, card C with resize.

## Global Constraints

- POSIX `sh` in `lib/md-view`; ES5 (`var`, `function`) in `lib/page.js`; no new tools.
- Keep these `lib/md-view` rules byte-for-byte: the rule head `#md-tree-panel { position: fixed`, the toggle rule, and the five `html[data-palette]` tree lines. Only the panel rule's width and padding change.
- Keep these lines byte-for-byte: `  html[data-panel] body { padding-left: 16px }`; `  #md-tree-panel, #md-tree-toggle { display: none }`; the print rule; the nav line `<nav id="md-tree-panel" aria-label="File tree"></nav>`.
- Names: key `md-view-tree-w`. Custom property `--md-panel-w`. Grip id `md-tree-resize`. Separator span class `md-sep`, text `›`.
- Numbers: `KEY_PANEL='md-view-tree-w'`, `PANEL_MIN=200`, `PANEL_MAX=560`, start 300, step 16, Shift 64.
- The document keeps exactly one `addEventListener('keydown'` string in `lib/page.js`. The grip uses `treeResize.onkeydown = function (e) {...}`.
- Geometry numbers move 292→332, 276→316, 268→308 in `tests/browser-links-dom.sh` (`:756-757`, `:787` and their comments).
- Commit message: a short imperative summary line, a blank line, then an optional body. No trailer. One commit per task.
- Check: `make check`. Owner-checked paths: the nine vendored `lib/` files (untouched here).
- Docs pages pass `check_ste.py` (ASD-STE100).

## T1: Panel CSS, grip markup, page-test pins

**Depends on:** none
**Done check:** `bash tests/browser-page.sh` exits 0.
**Role:** implementer — review task-reviewer
Apply every CSS row and the grip markup line of `spec.md` to the tree block in `lib/md-view`.
In `tests/browser-page.sh`: update the panel-width line of `case_page_tree_print_hidden` to `#md-tree-panel { position: fixed`. It pins the new rule head. Keep the print line verbatim there.
Keep the two narrow lines verbatim in `case_page_tree_narrow_rule`.
Add to `case_palette_layer` the row `'border-color: var(--p-border)' 'html[data-palette] #md-tree-panel details > div {'`.
Add `md-view-tree-w` to the key list of `case_page_storage_try_catch`. The key lives in the page script, so no fixture change is needed.

## T2: Chain rows in `buildTree`

**Depends on:** T1
**Done check:** `bash tests/browser-links-dom.sh` exits 0.
**Role:** implementer — review task-reviewer-critical
In `lib/page.js` `buildTree`, precompute over `order`. Build the set of folder keys, a child count per folder, and the only child per folder.
Walk `order` as today. At a folder key, extend a chain while the key has exactly one child and that child is a folder. Register every chain key's `<details>` and box in `treeFolders` and `boxes`. Emit one summary: name parts as text nodes, joined by `span.md-sep` nodes with text `›`.
Links, `aria-current`, and `markTree` stay as they are.
In `tests/browser-links-dom.sh`: move the geometry constants (Global Constraints). In `case_dom_panel_tree`, change the fixture file `dom/a/d.md` to `dom/deep/a/d.md`. Pin one chain summary: `deep<span class="md-sep"`, then `>›</span>a`, then `</summary>`, plus `href=".*#/dom/deep/a/d\.md"`. Keep the `sub` pin: `<summary>sub`.
Add `case_dom_panel_chain_stop`: the fixture `forms/v.md` plus `forms/fields/f.md`. Pin a `forms` summary with no `md-sep`, and a `fields` chain inside it (`fields</summary>`, with the `f.md` link).
In `case_dom_panel_folders_open`, change the fixture `dom/x/y/z.md` to `dom/deep/x/y/z.md`. Pin one chain summary `x › y › z` and the open state (one `details` opens for the whole chain).

## T3: Panel resize

**Depends on:** T2
**Done check:** `bash tests/browser-links-dom.sh` exits 0.
**Role:** implementer — review task-reviewer-critical
In `lib/page.js`, after `treeOpen`/`setTree`: add the constants of Global Constraints and a `panelW` value.
Add `panelLimit()` = `Math.max(PANEL_MIN, Math.min(PANEL_MAX, Math.floor(window.innerWidth / 2)))`.
Add `applyPanelWidth(w, keep)`: clamp to `panelLimit()`, store `panelW`, set `--md-panel-w` on `root.style`, set `aria-valuenow` on the grip, and call `save(KEY_PANEL, ...)` when `keep`.
Add `loadPanelWidth()`: accept only `^[0-9]{1,4}$`; any other value gives 300.
Add `wireResize()`, called from `wireControls` in tree mode only. It wires pointer drag on `#md-tree-resize`, with `setPointerCapture`. Moves call `applyPanelWidth(w, false)`; release calls it with `true`.
It wires `dblclick` to `applyPanelWidth(300, true)`. It wires `treeResize.onkeydown` for `ArrowLeft` and `ArrowRight`, with Shift step 64; all keys keep the width.
Add a `window` `resize` listener that re-applies the current width with `keep=false`.
`resetChoice`: remove `KEY_PANEL` and apply 300 (tree-mode guard). Init applies `applyPanelWidth(loadPanelWidth(), false)` before `buildTree`.
In `tests/browser-links-dom.sh` add four cases, registered like `dom_panel_width_rule` and using the `measured` and `title_is` helpers.
Events are synthetic scripts, as in `case_dom_panel_toggle_markup` (`:690`): a key is `document.getElementById('md-tree-resize').dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight'}))`.
`case_dom_panel_resize_key`: seed `md-view-tree-w=300` with the `seed()` pattern (`:878`). In a measured script, dispatch `ArrowRight` on the grip. Push `html` `style.getPropertyValue('--md-panel-w')` and `localStorage.getItem('md-view-tree-w')` into the title.
Dispatch `ArrowRight` with `shiftKey:true`, and push both values again. Then dispatch `ArrowLeft`, and push both values once more. `title_is` asserts the chain `316px 316 380px 380 364px 364`.
`case_dom_panel_resize_reset`: seed 300. In a measured script, send the grip a `pointerdown` at `clientX 297`, a `pointermove` at `clientX 357`, and a `pointerup`.
Push the panel `getBoundingClientRect().width` and the stored value into the title; assert `360 360`. Then dispatch `dblclick` on the grip and push width and store again. Assert `300 300` at the end of the title.
`case_dom_panel_reset`: build with no seed. In a measured script, find the `md-pop` button whose `textContent` is `Reset`, and click it. Push the panel width and the stored value into the title. `title_is` asserts `300 null`.
`case_dom_panel_resize_seed`: set `WINDOW=1200,800` for the case. Seed `md-view-tree-w=400` with the seed-reload pattern (`:878`). Measure the painted `#md-tree-panel` `getBoundingClientRect().width` into the title and assert 400.
A second build seeds `600` and asserts 560 (ceiling). A third seeds `100` and asserts 200 (floor). A fourth seeds the garbage value `300px` and asserts 300, with the stored value still `300px`.
A fifth build sets `WINDOW=900,800`, seeds `480`, and asserts 450 (half-window cap), with the stored value `480`.
`case_dom_panel_width_rule` keeps its shape; its `overflow-wrap` grep moves to the `summary` rule, which now carries the drop.

## T4: Durable docs

**Depends on:** T2, T3
**Done check:** `python3 $P/kb/scripts/check_ste.py docs/architecture/md-view.spec.md README.md` exits 0. (`$P` is the fde-delivery plugin root.)
**Role:** implementer-small — review final
Rewrite the Panel, Toggle, Saved state, Width, Narrow and Print rows of `docs/architecture/md-view.spec.md` per `spec.md`. Add `md-view-tree-w` to the Saved choice key list (`:145`). Add chain and resize rows to its Tests table.
Extend the README tree paragraph. It names the resizable panel (drag, keys, double-click) and the chain rows.
Keep every row string that the tests grep (Panel, Toggle, Print, Width, Narrow keep their leading words).

## T5: Integration proof

**Depends on:** T4
**Done check:** `make check` exits 0. Read the `skip` lines.
**Role:** implementer-small — review final
Run `make check` in full.
Build a deep fixture from the mock's tree. Open it headless at 1280 px. Screenshot the panel at default, after one drag, and after Shift+ArrowRight, in both palettes.
Put the screenshots and the commands in `closeout.md` under "Run it". Commit any test fix found.
