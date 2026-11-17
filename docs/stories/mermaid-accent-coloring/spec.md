# Spec: mermaid accent coloring

Unit under test: `lib/page.js` — `applyAccents(pre)` (new), `ACCENT_KEYS` (new),
`GITHUB_ACCENTS` (new), and the call in `drawDiagrams` at `lib/page.js:853`.
It runs only on a drawn SVG (`pre` contains an `svg`). A source-only block
gets no accents.

## Colors source

| Used palette and mode | Accent color source |
|---|---|
| `tokyo`, dark | `PALETTES.tokyo.dark[key]` for each key in `ACCENT_KEYS` |
| `tokyo`, light | `PALETTES.tokyo.light[key]` for each key in `ACCENT_KEYS` |
| `github`, dark | `GITHUB_ACCENTS.dark[i]` |
| `github`, light | `GITHUB_ACCENTS.light[i]` |

`ACCENT_KEYS` (fixed order, the accent cycle):
`['blue','cyan','green','magenta','orange','red','purple','yellow']`. These 8 keys
exist in both tokyo modes; the `tokyo/19` palette-key count is unchanged.

`GITHUB_ACCENTS` (github has no palette entry and no `--p-*` variables):

| i | key | light | dark |
|---|---|---|---|
| 0 | blue | `#0969da` | `#4493f8` |
| 1 | cyan | `#1b7c83` | `#33b5c9` |
| 2 | green | `#1a7f37` | `#3fb950` |
| 3 | magenta | `#8250df` | `#a56eff` |
| 4 | orange | `#bc4c00` | `#db6d28` |
| 5 | red | `#cf222e` | `#ff7b72` |
| 6 | purple | `#6639ba` | `#ab7df6` |
| 7 | yellow | `#9a6700` | `#d4a72c` |

The mode is `paletteMode().split(':')[1]` (`paletteMode()` returns `<palette>:<mode>`, for example
`tokyo:dark`); the palette name (tokyo versus github) is `paletteSetting()`. The table's `light` /
`dark` columns are the mode. The `tokyo` columns are the colors the page hands mermaid as
`themeVariables` (`lib/page.js:826-832`). The `github` columns are GitHub's own accent set, its
default light and dark accents.

## Flowchart scheme (1b hybrid)

`svg` has `g.cluster` elements = a clustered diagram. No `g.cluster` = a flat diagram.
The cluster of a node = the `g.cluster` whose child `rect` bounds contain the node's
`translate(x,y)` center. The bounds are the `rect` `x` / `y` / `width` / `height` attributes, not
`getBBox()`. When more than one cluster contains the center, the node's cluster is the innermost: the
smallest `width * height`. A tie keeps the later cluster in DOM order. Clusters are read in
`svg.querySelectorAll('g.cluster')` DOM order; index 0 is the first.

| Case | Node accent index | Connector accent index |
|---|---|---|
| Clustered, node inside cluster `ci` | `ci % 8` | source node's index |
| Clustered, node in no cluster | `0` (blue) | source node's index |
| Flat diagram | document-order node index `% 8` | source node's index |

A node's center is its `g.node` `transform` `translate(cx,cy)`. `applyAccents` first builds
the set of node keys: each `g.node` id with the `<svgId>-flowchart-` prefix dropped and one
trailing `-<n>` dropped.
A connector is `path.flowchart-link`; its `data-id` is `L_<src>_<tgt>_<n>`, and a key may itself
contain underscores (for example `write_src`). A naive `_` split mis-parses those, so:

1. Drop the leading `L_` and the trailing `_<n>` (the last `_`-segment, the edge counter): `rest = <src>_<tgt>`.
2. Take the longest node key that is a prefix of `rest`. Cut at a `_` boundary: the key is
   `rest` up to the `_` that starts the target. That key is the source.

The connector takes the accent of that source node. If no node key matches, `applyAccents` sets
nothing on the connector, so both `stroke` and `stroke-width` keep mermaid's theme values.

## Node and connector paint

| Element | Inline style set |
|---|---|
| node shape (`rect`/`polygon`/`circle`/`path` in `g.node`) | `stroke` = accent; `fill` = accent; `fill-opacity` = `0.15`; `stroke-width` = `2px` |
| connector `path.flowchart-link` | `stroke` = source accent; `stroke-width` = `2px` |

Inline `style` wins over the scoped `<style>` mermaid injects. `fill-opacity` blends
the accent over the diagram background, so no per-mode background is needed.

## Cluster box paint

| Element | Inline style set |
|---|---|
| `g.cluster rect` | `stroke` = accent at index `ci % 8`; `stroke-width` = `2px`; `fill-opacity` = `0.06`; `fill` = accent |

The box keeps the theme fill color and takes the family hue. `ci` is the cluster's own
DOM-order index, not a node's.

## Sequence scheme

A sequence SVG has `.actor` and no `g.node`. Color each `.actor` shape by its
document-order index `% 8`. Leave messages, activations, and lifelines on theme colors.

| Element | Inline style set |
|---|---|
| `.actor` `rect`/`polygon` | `stroke` = accent; `fill` = accent; `fill-opacity` = `0.15`; `stroke-width` = `2px` |

## Call site and redraw

`drawDiagrams` calls `applyAccents(it.pre)` for a drawn diagram, beside `addBar(it.pre)`
at `lib/page.js:853`, guarded by `it.pre.querySelector('svg')` and `!batch.cancelled`.
`redraw` re-runs `drawDiagrams`, so a theme, palette, or mode change re-colors the
accents. `applyAccents` adds no element: `svg.length` stays 1, and the root `svg`
`style` attribute is unchanged (accents set `style` on child shapes).

## Done

`make check` exits 0, with every table row above covered by a test in
`tests/hostile-dom.sh` (new `net_check` rows) and the existing `tokyo/19` count check
(`tests/browser-page.sh`) unchanged.

## Out of scope

- The scheme picker (story `mermaid-accent-toolbar`).
- Class, state, and other diagram types beyond flowchart and sequence.
- Hover / click focus.
- New palette keys (the accent cycle reuses the 8 existing keys).
