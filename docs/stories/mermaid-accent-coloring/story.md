---
description: Colors mermaid nodes and connectors with a Tokyo accent palette so blocks and flows read at a glance, the way Zed colors its diagrams.
status: retired
size: M
depends-on: mermaid-viewer
risk: contract
refs: docs/architecture/md-view.spec.md
---

# Story: mermaid accent coloring

## Goal

Make a rendered mermaid diagram easier to read. Give its nodes and connectors accent colors, so a reader sees the boxes, the flows, and the groups at a glance.

## Context

- Spec section "How diagrams render" (`docs/architecture/md-view.spec.md`, steps 1-6).
- Invariants: "Browser view" and the `[palette]` rule (`docs/architecture/md-view.invariants.md:12,27`).
- Story `mermaid-viewer` delivered `mermaid.run`, `drawDiagrams`, `addBar`, and the viewer (`docs/stories/mermaid-viewer/story.md`).
- Design mock `mocks/mermaid-accent-options.html` (panels A-E), the visual reference the owner approved (owner pick: panel E, 2026-11-17).
- `lib/page.js` draw path: `show` (409) -> `redraw` (722) -> `drawDiagrams` (681); `mermaid.run` (702); the settle block calls `addBar(it.pre)` at 711, guarded by `it.pre.querySelector('svg')` and `batch.cancelled`.
- Mermaid 12.3.0 SVG shape (from the mock run): node `<g class="node">` with id `<svgId>-<key>`; edge `path.flowchart-link[data-id="L_<src>_<tgt>_<n>"]`; subgraph box `g.cluster` with a child `rect`. In 12.3.0 `g.cluster` and `g.node` are sibling layers, not nested, so a node's group is found by geometry.

## Scope

**In:**
- `lib/page.js`: a new accent pass, run beside `addBar(it.pre)` at `lib/page.js:711`. It applies on first draw, every redraw, and every theme or palette change. It runs only on drawn SVGs.
  - Scheme (owner pick, "1b hybrid"): if the diagram has one or more `g.cluster`, a node takes the hue of its cluster, one hue per subgraph. A node in no cluster takes a positional hue. With no cluster, every node takes a positional hue. A positional hue is the node index in document order, modulo 8.
  - Cluster of a node = the `g.cluster` whose `rect` bounds contain the node's `translate(x,y)` center.
  - Each connector (`path.flowchart-link`) takes the hue of its source node. Source and target come from `data-id` `L_<src>_<tgt>_<n>`.
  - The pass sets `stroke`, `fill`, and `stroke-width` through `element.style` (inline style beats the scoped `<style>` mermaid injects; presentation attributes lose). Fill is the accent at 15% blended over the theme background; stroke is the accent.
  - Sequence diagrams (`.actor` present, no node graph): color each actor box by its positional hue; leave messages, activations, and lifelines on the theme colors.
  - `lib/page.js`: the 8-color accent cycle, reusing the existing keys `blue, cyan, green, magenta, orange, red, purple, yellow` (no new palette keys). For `tokyo`, colors come from the used-mode map. For `github`, the pass uses a fixed light/dark accent list in `page.js` (github has no `--p-*` variables).
- Spec: add the accent step to "How diagrams render" (after step 4) and note the accent in the Palette row.
- Tests: accent checks as new `net_check` rows in `tests/hostile-dom.sh` (see acceptance).

**Out:**
- The scheme picker in the diagram bar and viewer (a follow-on story, `mermaid-accent-toolbar`).
- Class, state, and other diagram types beyond flowchart and sequence (follow-on).
- Hover / click node focus (preset of the toolbar story).
- New `--p-*` palette keys (the accent cycle reuses existing keys, so the `tokyo/19` count stays 19).

## Size

M. One new function plus a call site in `lib/page.js`; a fixed accent list; one spec step; a few `hostile-dom.sh` rows. No new vendored file, no shell change, no new palette key. It rides the `mermaid-viewer` draw path, so it shares `lib/page.js` and the spec diagram section with that story and runs after it merges.

## Unknowns

- Cluster geometry edges: nested `subgraph`s, a node on a cluster boundary, and a node taller than its box. Spike in `lib/page.js` against a nested-subgraph fixture (answer: pick the innermost containing cluster).
- `github` accent hex set and label contrast on the 15% tint (unmeasured). Spike picks a set that reads on both light and dark.
- Multi-edge `data-id` collisions (`L_A_B_0`, `L_A_B_1`): the source parse must take `parts[1]`/`parts[2]`, not a greedy split. Confirm with a multi-edge fixture.

## Acceptance criteria

- `tests/fixtures/diagram.md` (flat, no subgraph): each node shows a distinct accent `stroke` in document order; each connector's `stroke` equals its source node's `stroke`. New `net_check` row asserts two first-node strokes differ and a connector stroke equals its source.
- A 3-subgraph fixture (the mock pitch loop, as `tests/fixtures/accent-subgraphs.md`): nodes inside one subgraph share one `stroke`; nodes in different subgraphs differ.
- `tests/fixtures/broken-diagram.md`: the source-only block gets no accents; the drawn block gets them.
- Theme and palette change (tokyo to github, dark to light) redraws the diagram with accents in the used palette. Assert an accent `stroke` is present after `setTheme`/`setPalette`.
- `fit_page`: `document.querySelectorAll('svg').length === 1` after the viewer opens (the pass adds no `<svg>`).
- `close_page`: the root `<svg>` `style` attribute equals its pre-open value (accents set `style` on child shapes, not the root).
- Offline (CDN blocked): each diagram shows its source, with no accent (behavior unchanged).
- Close-out docs: spec "How diagrams render" gains the accent step and the Palette row note; invariants "Browser view" gains a sentence that drawn diagrams carry an accent pass.

## Notes

- Owner decisions (2026-11-17): base scheme = mock panel E (1b: one hue per subgraph, else positional). Connectors colored by source node. Toolbar scheme picker deferred to `mermaid-accent-toolbar`. v1 covers flowchart and sequence.
- Accent cycle = 8 slots, the existing keys `blue, cyan, green, magenta, orange, red, purple, yellow`; index = `order % 8` (positional) or `clusterIndex % 8` (grouped). The mock uses stride 3 for a within-cluster variant; this story ships the one-hue-per-subgraph form (the owner's pick).
- Fill blend (15% accent over `#1a1b26`) is a design value. Keep it one named constant in `page.js`, so a later palette story can tune it.
- Branch `feat/mermaid-accent-coloring`, base `main`, after `mermaid-viewer` merges (both edit `lib/page.js` and the spec diagram section, so they do not run in parallel).
- Budget M (hard stop L). Check: `make check`; the new rows need Chrome + the CDN (skip with `skip` lines otherwise).
- started: 2026-11-17T12:08:00Z (main-session cost window start).
- Budget / hard stop: M = $15 / $20. Check: `make check`.
- flow tier=full docs=spec,plan design=no orchestrator=yes final=final-reviewer gate=stop scan=yes verifier=none
- Gate page: gate=stop → owner reads `gate.md` before the build (G2-design).
- Owner-checked paths: `docs/architecture/md-view.spec.md` (builder edits per scope), `docs/stories/mermaid-accent-coloring/story.md` (brief).
- Worktree `.worktrees/mermaid-accent-coloring`, branch `feat/mermaid-accent-coloring`, base `main` (mermaid-viewer merged).
- Accent palette = 8 existing keys (blue, cyan, green, magenta, orange, red, purple, yellow); `tokyo/19` test count unchanged.
