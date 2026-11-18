# Spec: tree-panel-compact-resize

The durable contract stays in `docs/architecture/md-view.spec.md`; the rows named here change there.

## Tree panel CSS (tree block in `lib/md-view`, emitted only in tree mode)

| Item | Exact value |
|---|---|
| Panel width | `#md-tree-panel` keeps its rule, with `width: var(--md-panel-w, 300px)` and `padding: 6px 10px 8px`. The page script owns `--md-panel-w` on `html`. |
| Body gutter | `html[data-panel="open"] body { padding-left: calc(var(--md-panel-w, 300px) + 16px) }` |
| Toggle | `#md-tree-toggle` keeps its rule, with `left: calc(var(--md-panel-w, 300px) + 8px)`. The closed line `html[data-panel="closed"] #md-tree-toggle { left: 8px }` stays. |
| Rail | `#md-tree-panel details > div { margin-left: 7px; padding-left: 9px; border-left: 1px solid GrayText }` |
| Summary | `#md-tree-panel summary { display: flex; align-items: baseline; gap: 4px; padding: 1px 4px; border-radius: 4px; font-weight: 500; cursor: pointer; list-style: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }`; `#md-tree-panel summary::-webkit-details-marker { display: none }`; `#md-tree-panel summary::before { content: '\203A'; flex: none; width: 8px; color: GrayText }`; `#md-tree-panel details[open] > summary::before { transform: rotate(90deg) }` |
| File link | `#md-tree-panel a { display: block; padding: 1px 4px 1px 18px; border-radius: 4px; color: inherit; text-decoration: none; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }`. The old `overflow-wrap: anywhere` drops. |
| Chain separator | `#md-tree-panel .md-sep { opacity: .6; font-weight: 400 }` |
| Root head | `#md-tree-panel .md-root { position: sticky; top: 0; z-index: 1; margin: 0 0 2px; padding: 7px 0 6px; background: inherit; font-weight: 600 }`. The old `overflow-wrap: anywhere` drops. |
| Grip | `#md-tree-resize { position: fixed; top: 0; bottom: 0; left: calc(var(--md-panel-w, 300px) - 3px); z-index: 11; width: 6px; cursor: col-resize; touch-action: none }`; `html[data-panel="closed"] #md-tree-resize { display: none }`; `#md-tree-resize:hover { background: color-mix(in srgb, currentColor 12%, transparent) }` |
| Narrow | The two pinned lines stay verbatim: `  html[data-panel] body { padding-left: 16px }` and `  #md-tree-panel, #md-tree-toggle { display: none }`. New line after them: `  #md-tree-resize { display: none }`. |
| Print | The pinned line stays verbatim: `@media print { #md-gear, #md-pop, #md-tree-panel, #md-tree-toggle, .md-dbar { display: none !important } }`. New line after it: `@media print { #md-tree-resize { display: none !important } }`. |
| Palette | The five existing `html[data-palette]` tree lines stay. New line after them: `html[data-palette] #md-tree-panel details > div { border-color: var(--p-border) }`. |

## Panel markup (`lib/md-view`, tree mode)

| Emit | Exact |
|---|---|
| Grip, after the nav line | `<div id="md-tree-resize" role="separator" aria-orientation="vertical" aria-label="Resize the file tree" tabindex="0"></div>` |

The toggle and nav lines stay byte-for-byte. One-file mode emits neither.

## Chain rows (`buildTree` in `lib/page.js`)

A chain is a run of folders where each folder has exactly one child and that child is a folder. The run and its last folder render as one `<details>`.

| Fixture tree | Panel shows |
|---|---|
| `deep/a/d.md` only | One `<details>`; its summary is the text `deep`, a `<span class="md-sep">›</span>`, the text `a`; the box holds the link to `d.md`. |
| `sub/a.md` (folder with one file) | One `<details>` with summary text `sub` (no separator). |
| `deep/a/d.md` plus `sub/a.md` | Two top-level `<details>`: chain `deep › a`, plain `sub`. Tree order of links is unchanged. |
| `forms/fields/f.md` plus `forms/v.md` | Chain stops at `forms` (two children): summary `forms`; the box holds `v.md` and the chain `fields`. |
| Route `#/deep/a/d.md` | The chain `<details>` is open. One `details` opens for the whole chain. |

Names go in with `textContent`: a hostile name cannot make an element. `decName` and the decoded base name rule stay.

## Panel resize (`lib/page.js`)

| Trigger | Result |
|---|---|
| Load, no saved value | Panel width 300 px: `html` style `--md-panel-w: 300px`. |
| Load, saved `md-view-tree-w` = `400` | Width 400 px. |
| Load, saved `md-view-tree-w` = `300px` (garbage) | Width 300 px; the stored value is untouched. |
| `ArrowRight` on the focused grip, from 300 | Width 316 px; `localStorage.md-view-tree-w` is `316`. |
| `Shift` + `ArrowRight`, from 316 | Width 380 px; saves `380`. |
| `ArrowLeft`, after 380 | Width 364 px; saves `364`. |
| Load, saved `md-view-tree-w` = `600` | Width 560 px (ceiling). |
| Load, saved `md-view-tree-w` = `100` | Width 200 px (floor). |
| Window 900 px wide, saved `md-view-tree-w` = `480` | Width 450 px (`floor(900/2)` cap on load; store untouched). |
| Pointer drag on the grip right by 60 px | Width 360 px; saves on release. |
| Double-click the grip | Width 300 px; saves `300`. |
| Reset in the popover | Width 300 px; the key is removed. |

Constants: `KEY_PANEL = 'md-view-tree-w'`, `PANEL_MIN = 200`, `PANEL_MAX = 560`, start 300. The saved value is a string of 1 to 4 digits (`^[0-9]{1,4}$`); any other value gives 300. The width goes on `html` through `root.style.setProperty('--md-panel-w', ...)`; the grip carries `aria-valuenow` as the whole number. `localStorage` reads and writes go through the existing `storageGet` / `save` / `storageRemove` wrappers. The document keeps one `addEventListener('keydown'` string: the grip uses `treeResize.onkeydown = function (e) {...}`.

## Docs

| Page | Change |
|---|---|
| `docs/architecture/md-view.spec.md` | Panel row: rails, chevron, chain rows, ellipsis, 300 px default. Toggle row: the grip, its keys, double-click reset. Saved state row: key `md-view-tree-w`. Width row: `--md-panel-w`, clamp 200..560 and half the window. Narrow row: the grip hides. Print row: the grip hides. Saved choice row (`:145`): `md-view-tree-w` joins the key list. Tests table: chain and resize rows. |
| `README.md` | The tree paragraph: the panel is resizable (drag, arrows, double-click), and a single-child folder chain shows on one row. |

## Done

`make check` exits 0 (read the `skip` lines). Every row above has a test.
CSS and markup rows: `tests/browser-page.sh` (`case_page_tree_print_hidden`, `case_page_tree_narrow_rule`, `case_palette_layer`, `case_page_storage_try_catch`).
DOM rows: `tests/browser-links-dom.sh` (`case_dom_panel_tree`, `case_dom_panel_folders_open`, `case_dom_panel_width_rule`, `case_dom_panel_gear_fixed`, and at least 4 new cases: `case_dom_panel_chain_stop`, `case_dom_panel_resize_key`, `case_dom_panel_resize_reset`, `case_dom_panel_resize_seed`, `case_dom_panel_reset`).
`check_ste.py` is clean on the touched pages.

## Out of scope

Breadcrumb row for the current path. Collapse-all button. Auto-width from content. `title` tooltips on names. `Home`/`End` on the grip.
