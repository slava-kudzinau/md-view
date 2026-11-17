# Plan: mermaid accent coloring

Spec: `spec.md` (governs exact values). Design: none (≤6 tasks; the design is here).

## Global Constraints

- Language: the page script is one IIFE in `lib/page.js`, ES5 style — `var`, function
  declarations, `for (var x of y)` is allowed. No new tool, no new package.
- File touched: `lib/page.js` (code), `docs/architecture/md-view.spec.md` (spec step),
  `docs/architecture/md-view.invariants.md` (one line), `tests/hostile-dom.sh` (rows),
  `tests/fixtures/accent-subgraphs.md` (new fixture).
- `ACCENT_KEYS` (fixed order): `['blue','cyan','green','magenta','orange','red','purple','yellow']`.
  These keys exist in `PALETTES.tokyo.dark` and `.light` (`lib/page.js:25-69`).
- `GITHUB_ACCENTS = { light: [...], dark: [...] }` — the 8 hexes in `spec.md`, same index
  order as `ACCENT_KEYS`. Add it near `PALETTES` (`lib/page.js:70`).
- Colors: `tokyo` → `PALETTES.tokyo[paletteMode()][key]`; `github` → `GITHUB_ACCENTS[paletteMode()][i]`.
  `paletteMode()` returns the used mode string (`lib/page.js:557`).
- Scheme (1b), cluster basis = `svg.querySelectorAll('g.cluster')` DOM order; node cluster =
  the cluster `rect` whose bounds contain the node `translate` center; nested = innermost.
  Clustered: node index = `ci % 8` (in cluster) else `0`; flat: node index = document-order
  index `% 8`. Connector index = source node index. Sequence: `.actor` index `% 8`.
- Paint: node/actor/cluster shape `style.fill` = accent, `style.fillOpacity` = `'0.15'`
  (clusters `'0.06'`), `style.stroke` = accent, `style.strokeWidth` = `'2px'`. Connector
  `path.flowchart-link` `style.stroke` = source accent, `style.strokeWidth` = `'2px'`.
- Connector source: `data-id` `L_<src>_<tgt>_<n>`; a key may contain underscores. Build the node-key
  set first (each `g.node` id's part after `<svgId>-`). Drop leading `L_` and trailing `_<n>`, then take
  the longest node-key prefix of the rest at a `_` boundary as the source. No match → set nothing on
  the connector, so both `stroke` and `stroke-width` keep mermaid's theme values.
- Call site: in `drawDiagrams` at `lib/page.js:711`, add `applyAccents(it.pre)` beside
  `addBar(it.pre)`, inside the same `if (it.pre.querySelector('svg'))` guard.
- `applyAccents` adds no element; the root `<svg>` `style` attribute stays unchanged.
- Palette accessor: the palette name from `paletteSetting()` (`lib/page.js:512`, returns `'github'` or the palette key); the mode from `paletteMode().split(':')[1]` (`paletteMode()` returns `'<palette>:<mode>'`, for example `tokyo:dark`). Do not read `data-palette` from the DOM.
- Node center: parse the `g.node` `transform` with `/translate\(\s*([-\d.]+)[, ]+([-\d.]+)/`; the two numbers are the center. Do not use `getBBox()` (the viewer zoom transform on the root would skew it).
- Cluster: bounds come from the cluster `rect` `x` / `y` / `width` / `height` attributes, not `getBBox()`. Among clusters whose `rect` contains the node center, the node's cluster is the smallest `width * height` (innermost). A tie keeps the later cluster in DOM order.
- Node shape: paint the first shape child of `g.node` — `> rect`, `> polygon`, `> circle`, `> ellipse`, `> path` — not the label `text`. Sequence actor: paint the `.actor` `> rect` / `> polygon` child, not the `.actor` label.
- Paint is idempotent: `applyAccents` sets all four props on every drawn shape each run, so a redraw overwrites and needs no clearing step.
- Commit message: a short imperative summary line, a blank line, then `Refs: mermaid-accent-coloring`.
  One commit per task.
- Check: `make check`. Owner-checked paths: `docs/architecture/md-view.spec.md`, the story brief.

## T1: accent pass in the page script

**Depends on:** none
**Done check:** `make check` exits 0
**Role:** implementer — review task-reviewer-critical (public contract: adds a documented render step)

Add to `lib/page.js`:
- `GITHUB_ACCENTS` (exact hexes from `spec.md`), near `PALETTES`.
- `ACCENT_KEYS` (the 8-key array).
- `function accentColor(i)` → returns the hex for index `i % 8` for the used palette+mode
  (tokyo reads `PALETTES.tokyo[paletteMode().split(':')[1]][ACCENT_KEYS[i%8]]`; github reads
  `GITHUB_ACCENTS[paletteMode().split(':')[1]][i%8]`).
- `function applyAccents(pre)` → per `spec.md` "Flowchart scheme", "Node and connector
  paint", "Cluster box paint", "Sequence scheme". Detect `g.node` (flowchart) vs `.actor`
  (sequence). Node cluster by geometry. Set inline `style` as in the tables.
- Wire the call at `lib/page.js:711` beside `addBar(it.pre)`.
No fixture/test in this task; T2 covers them.

## T2: fixture and hostile-DOM rows

**Depends on:** T1
**Done check:** `make check` exits 0
**Role:** implementer — review final

- Add `tests/fixtures/accent-subgraphs.md`: a flowchart with 3 subgraphs — `alpha` (a1, a2), `beta` (b1, b2), `gamma` (g1, g2, g3). Edges `a1-->a2`, `b1-->b2`, `g1-->g2`, `g2-->g3`, and one crossing edge `a1-->b1` (source in `alpha`). Plain ids, no underscores; the underscore-id rule is T1 logic, not a fixture row.
- `net_check` asserts on inline `style` (`el.style.stroke`), not computed style. The connector-to-source map uses the same longest-prefix rule as T1.
- In `tests/hostile-dom.sh`, add `net_check` rows (Chrome + CDN; skip lines otherwise):
  - flat fixture `diagram.md`: two first nodes have a non-equal accent `stroke`;
    a connector's `stroke` equals its source node's `stroke`.
  - `accent-subgraphs.md`: nodes in one subgraph share one `stroke`; two subgraphs differ;
    the `g.cluster rect` `stroke` is an accent, not the theme border.
  - `broken-diagram.md`: the source-only block has no node accent.
  - after `setTheme`/`setPalette`: an accent `stroke` is present (redraw re-colors).
  - `fit_page`: `document.querySelectorAll('svg').length === 1`. `close_page`: capture the root
    `<svg>` `getAttribute('style')` (or `''` when absent) before the viewer opens and compare after
    close; assert equal (accents touch child shapes only).
  - offline (CDN blocked): the drawn block shows its source, no accent (unchanged).

## T3: durable docs

**Depends on:** T1
**Done check:** `python3 ~/.omp-local/plugins/fde-delivery/kb/scripts/check_ste.py docs/architecture/md-view.spec.md docs/architecture/md-view.invariants.md` exits 0 and `make check` exits 0
**Role:** implementer — review final

- `docs/architecture/md-view.spec.md`, "How diagrams render": add step 4b "After the draw, the
  page colors each drawn diagram's node, actor, and connector shapes with an accent palette
  (section Palette). A node in a subgraph takes its subgraph's hue; a node in no subgraph
  takes a positional hue; a diagram with no subgraph colors every node positionally. A
  connector takes its source node's hue." Keep the bar/viewer steps.
- Palette row: add verbatim — "The accent cycle reuses the 8 keys `blue, cyan, green, magenta,
  orange, red, purple, yellow`. The `tokyo` key count stays 19. The `github` palette uses a fixed
  accent list in the page script, 8 hexes per mode."
- `docs/architecture/md-view.invariants.md`, "Browser view": one line — drawn diagrams carry an
  accent pass that sets inline `style` on child shapes only; the root `<svg>` `style` is unchanged.
