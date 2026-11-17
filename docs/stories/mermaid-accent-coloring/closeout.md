# Close-out draft: mermaid-accent-coloring

Commits:
- `8fb93be` Add an accent paint pass to drawn mermaid diagrams (T1: `lib/page.js`).
- `1f2a6ff` Document the diagram accent pass (T3: `docs/architecture/*.md`).
- `7deab0b` Cut flowchart node ids to their bare key (T1 fix-1: `lib/page.js`).
- `0148b9b` Add accent rows to the hostile-DOM check (T2: `tests/`).
- `75f9fad` Cover the sequence actors and the connector hue (final-review fix-1: cluster connector check, story-spec citations, index, sequence row v1).
- `0458481` Paint the sequence actor boxes with the accent (final-review fix-3: `lib/page.js` actor selector + sequence row, HEAD).

Base: `4fe730a` (merge-base). Story docs in `5f5618e`.
Check: `make check` exit 0 (all 197 rows pass; six accent rows green; no skips). Run on HEAD `0458481`.

## Rulings

1. Palette and mode: `paletteMode()` returns `<palette>:<mode>`. The code takes the mode with
   `paletteMode().split(':')[1]` and the palette name with `paletteSetting()`. The colors table
   indexes `.dark` / `.light`.
2. Node shape selector: the first shape child of `g.node` accepts `rect`, `polygon`, `circle`,
   `ellipse`, `path`, in that order. The spec table lists four; `ellipse` costs one selector term.
3. Nested clusters: among clusters whose `rect` holds the node center, take the smallest
   `width * height` area. A tie keeps the later cluster in DOM order. This gives "innermost" a number.
4. Cluster bounds: the bounds come from the `rect` x / y / width / height attributes, not
   `getBBox()`. Mermaid emits them as attributes, and the root zoom transform does not skew them.
5. Connector with no matching node key: `applyAccents` sets nothing on it. Both `stroke` and
   `strokeWidth` keep mermaid's theme values. "Leave on the theme color" means both props.
6. Sequence actors: index in document order, `% 8`. The page selector is `rect.actor, polygon.actor`
   (final-review fix-3): in mermaid 12.3 the `.actor` class sits on the box `rect`, and that `rect`
   has no `rect`/`polygon` child, so the earlier `shapeOf(actors[i], ['rect','polygon'])` painted
   nothing. The flowchart `g.node` gate is unchanged.
7. Palette coverage: the flat `diagram.md` and `accent-subgraphs.md` rows render on the default
   `github` palette, so they cover `GITHUB_ACCENTS`. The redraw row covers the `tokyo` path (keys
   `s` then `t`, `t`).
8. T3 placement: the verbatim Palette sentence goes at the end of the `Palette` cell of the settings
   table (`docs/architecture/md-view.spec.md:137`); the new render step goes after the draw step in
   the numbered list of "How diagrams render". The bar, viewer, and close steps keep their order.
9. Test connector rule: the test JS (`keyOf`, `srcKey`, `linksOk`) mirrors the page's node-key and
   longest-prefix connector-source rules. A change to the page key format moves the helpers and the
   row title strings together.

## For close-out (main session applies with owner gates)

These touch owner-checked paths and the status fields; the orchestrator left them for the close-out.

1. `docs/stories/mermaid-accent-coloring/story.md:57` says "A 4-subgraph fixture". The plan and the
   shipped fixture use three groups (`alpha`, `beta`, `gamma`). Update the brief line to three, or
   add a fourth group to the fixture and a `clusters=4` expectation.
2. `docs/stories/mermaid-accent-coloring/story.md:3` frontmatter: `in-progress` → `in-review`.
   `docs/stories/index.md` is already `in-review`.
3. `docs/architecture/md-view.spec.md:157` ends the new render step with "(section Palette)". The
   accent keys live in the `Palette` row of the settings table, not a section. Point at the row, for
   example "(the Palette row above)".

## Parked findings

- T1 three Minor (a duplicated `'2px'` literal; `g.node` queried twice across `applyAccents` and
  `paintFlowchart`; the cluster `'0.06'` bare literal): cosmetic, no runtime cost. Ruling 8's one
  named constant covers the `0.15` blend (`ACCENT_FILL_OPACITY`).
- T1 fix-1 concern 3: the test `keyOf` uses the greedy `/^.*flowchart-/`; the page uses the
  `<svgId>-flowchart-` prefix. The two agree on every `mermaid-<ts>-flowchart-<key>-<n>` id; they
  split only for a node key that itself contains `flowchart-`, which no fixture uses.
- T2 concern: the accent rows need the mermaid CDN and ask a 15000 ms virtual-time budget.
  `net_check` prints `skip` when Chrome or the network is absent, so the rows cost nothing off a
  full machine; 15000 ms virtual is about three times the observed draw cost.
- Final review (whole branch): 0 Critical, 1 Important (sequence coverage), 5 Minor. The Important
  and the four fixable Minors are fixed (fix-1, fix-3). The re-review is clean: 0 / 0 / 0.

## Lessons

- Headless-Chrome rows under `--virtual-time-budget` capture `document.title` at process exit. The
  reliable pattern: seed the title up front, gate on the paint (stroke PRESENCE or a stroke CHANGE),
  not on an svg-node identity, and rewrite the full success title on the observed tick and every
  later tick, so the dump captures the furthest stage. This landed the T2 redraw row and the fix-3
  sequence row.
- In mermaid 12.3 the sequence `.actor` class is on the box `rect` (`rect.actor.actor-top`,
  `rect.actor.actor-bottom`); the label is a separate `text.actor.actor-box`. A paint pass that
  walks for a shape child of a `.actor` group finds nothing. Target `rect.actor, polygon.actor`.
  Worth a line in the project's notes so the next pass does not re-derive it.
- An implementer that grinds a headless-timing row converges far faster when the brief carries the
  proven title-seed + gate-on-change recipe. A fresh dispatch with the ruling in the brief beats a
  mid-task message.

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| task-reviewer-critical | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 0 | 0 |
| final-reviewer | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 1 | 5 |
| re-reviewer | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 0 | 0 |
