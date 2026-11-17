---
description: One color table in the page script drives the palette layer, the code colors and mermaid; a new palette is a data row, not new code.
status: accepted
date: 2026-11-17
---

# ADR-002: the palette table

## Context

- The page began with the vendored GitHub styles only (the `github` look). The owner asked for a Tokyo Night palette, and ruled that more palettes will come.
- A palette colors four surfaces at once: the page text and code, the tree panel, the gear and popover, and the mermaid diagrams.
- The accent pass (ADR-001 era, story mermaid-accent-coloring) reuses an 8-key cycle; the `tokyo` palette holds 19 named color keys.

## Decision

The page script holds one color table per palette and mode. It writes the `--p-*` variables on `html`, so the layer, the code colors and mermaid `themeVariables` all read the same source. `github` is "no layer" - the vendored styles show as today.

- The setting is `palette` (`github`, `tokyo`), in `config.ini` and on the command line.
- In the popover the row is `Style`. The mode row keeps the name `Theme`.
- Adding a palette is a new row of the table, with no new code: changing a palette clears the `--p-*` variables of every palette first.

## Consequences

- One source of truth for color; the three consumers cannot drift.
- A new palette is data. The code-token colors are rules that read the table, and mermaid uses `theme:'base'` with `themeVariables` from the same colors.
- The table keys must stay in step across modes (the `tokyo` count is 19). The spec pins the count.

## Rejected alternatives

### New mode words `tokyo-night` / `tokyo-day` in `theme`

**Why rejected:** each palette would add two words, and `auto` could not follow the system. The palette is a second setting; the mode keeps `light`, `dark`, `auto`.

### Setting names `style` or `scheme`

**Why rejected:** the spec already names the GitHub style; `scheme` clashes with CSS `color-scheme`. The setting is `palette`.

### Per-palette and per-mode stylesheets written by the shell

**Why rejected:** one table in the page script is smaller and drives mermaid too.

### A GitHub palette, a vendored highlight.js Tokyo file, a second mermaid color table

**Why rejected:** `github` needs no layer; the existing highlight themes work; one table feeds all three consumers.

## Notes

Color-mapping choices the next palette faces again (values live in the `PALETTES` table in `lib/md-view`): borders use the source key `fg_gutter`, not `border` (Night's `border` is near the page color); the current tree file uses `bg-visual`, not `bg-hl` (Day: `bg-hl` is near the panel color).
