# Close-out: select label text in the diagram viewer with Shift

Result: Shift+drag selects label text in the diagram viewer; holding Shift shows the text cursor. Check: `make check` exit 0 (all suites, no skips).

Commits: 6df66d6 page code (T1); 6973240 tests and docs (T2); cc8d4be toolchain fixes for two unrelated rows.

## Decisions made in the build

1. Gate the new test row on `getComputedStyle(box).userSelect === 'text'` for select mode; the headless run confirms Chrome reports `text`. The plain-`user-select` end check keeps `=== 'none'`.
2. Toolchain fix commit `cc8d4be`: Chrome 158 keeps the leading BOM in `textContent`, so strip it in `unescapeText`; split the `far2l-escape.sed` bracket class in three commands so BSD, GNU and uutils `sed` 0.1.1 all parse it. Unrelated to the feature.
3. Keep the `md-select` clear in `endDrag` only (not on the dialog): see the minor finding.
4. After a real-browser check, the owner switched mermaid labels to HTML (`htmlLabels: true`, commit 61036d3): SVG `<text>` selection anchors at the nearest glyph in layout order, so a Shift+click started far from the clicked word. HTML labels give caret and word granularity; the select row gates on `foreignObject` too.

## Minor findings not fixed

1. A shift-drag released over the toolbar leaves `md-select` on the box until the next pointerup on the box or a close. Cosmetic and self-healing; the fix is one extra `dlg` pointerup listener.

## Durable docs changed

- `docs/architecture/md-view.spec.md`: the viewer row, flow item 7 and the tests row name the select mode (commit 6973240).
- `docs/architecture/md-view.invariants.md`: new rule — viewer css rules stay inside the `viewer_map` delete range.
- No ADR: the choice lives in the spec and the README; nothing was paid for that the next reader would re-derive.

## Lessons

None for the plugin. The `viewer_map` range rule is now an invariant.

## Review yield

_The findings of each reviewer role: Critical, Important and Minor._

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| final-reviewer-light | mlx/local/Swift-1.5-Flash-Next-Heretic-MLX-Serve-iQ-MLX-Dense46 | 1 | 0 | 0 | 1 |
