---
description: Adds a scheme picker to the diagram bar and viewer so a reader can switch the mermaid accent scheme (hybrid, depth, focus) and have the choice persist.
status: planned
size: M
depends-on: mermaid-accent-coloring
risk: contract
refs: docs/architecture/md-view.spec.md
---

# Story: mermaid accent toolbar

## Goal

The base story ships one auto scheme (the 1b hybrid). Some diagrams read better under a flow-depth scheme, and large diagrams read better under a focus scheme.

## Context

- Story `mermaid-accent-coloring` (the accent pass and its scheme functions).
- Spec rows "Diagram bar" and "Diagram viewer", and the Keys row (`docs/architecture/md-view.spec.md`).
- `lib/page.js` persistence precedent: `KEY_WIDTH`, `KEY_THEME` in `localStorage` (`lib/page.js:72-73`); `redraw` (`lib/page.js:722`) re-runs the draw path.
- Design mock panels A, B, D (`mocks/mermaid-accent-options.html`) show the three presets.

## Scope

**In:**
- A scheme picker control in `.md-dbar` and in the viewer tools `.md-vtools`. Presets: Hybrid (the base), Depth (topological layering, connectors by source), and Focus. Focus keeps a hovered or clicked node with its connectors and neighbors, and dims the rest.
- Persist the choice in `localStorage` under a new key (one value per page), and read it at load.
- Switching the scheme calls `redraw`, and the Focus preset wires hover/click on the drawn SVG.
- Spec: the Diagram bar, Diagram viewer, and Keys rows gain the control and any key.

**Out:**
- More diagram types (class, state).
- A scheme per diagram (the choice is per page).

## Size

A DOM control in two places, and one `localStorage` key. Add CSS rules to `lib/page.css`, which `viewer_map` and the head-line-count check in `tests/browser-page.sh` must learn. Add a hover/click handler, spec rows, and `hostile-dom.sh` rows.

## Unknowns

- Control shape: a cycle button (one key, like `t` and `s`) versus a small segmented control. Answer at G1-brief; a cycle button is cheaper.
- Keyboard: reuse a key or add one while the viewer is open. Answer at G1-brief.

## Acceptance criteria

- A control in the bar and the viewer switches among Hybrid, Depth, Focus; the diagram re-renders in the chosen scheme.
- Focus: hovering a node keeps it, its connectors, and its direct neighbors bright, and dims the rest; a click pins and a second click unpins.
- The choice persists across reloads, like `md-view-theme`.
- `fit_page` keeps `svg.length === 1`; `close_page` keeps the root `<svg>` `style` unchanged.
- Close-out: spec bar/viewer/keys rows and the invariants "Browser view" line updated.

## Notes

- Owner decision (2026-11-17): the picker is a follow-on to `mermaid-accent-coloring`, not in v1.
- Branch `feat/mermaid-accent-toolbar`, base `main`, after `mermaid-accent-coloring` merges (it edits the same accent code).
- Budget M (hard stop L). Check: `make check`.
