---
description: Rules that always hold for md-view, each with where it was learned.
refs:
  - docs/architecture/md-view.spec.md
  - docs/architecture/decisions/adr-001-standalone-tool.md
---

# md-view invariants

Rules that always hold for md-view. Format: `- **[area]**: rule (Learned from: source, date)`. To retire one, delete it and say why in the commit or an ADR. The contract is in [the spec](md-view.spec.md).

## Browser view

- **[browser]**: `lib/md-view` treats the Markdown file as untrusted. The text goes into the page as escaped data (`\` first, then `</` and `<!--`) and raw HTML shows as text. Mermaid runs with `securityLevel:'strict'`. The page has a `Content-Security-Policy` that allows inline scripts, scripts from all of `https://cdn.jsdelivr.net`, and local images only. Only the page script pins the mermaid URL (`MERMAID_URL`) and its `integrity` hash (`MERMAID_SRI`). The text shows before the CDN script loads. (Learned from: far2l story markdown-browser-view, first final review, 2026-11-06)
- **[browser]**: The printed far2l command leaves `!.!` unquoted, because far2l escapes the file name. (Learned from: far2l story markdown-browser-view, first final review, 2026-11-06)
- **[browser]**: No script edits the config file of a host. far2l rewrites its `config.ini` on exit. The user adds the File associations entry by hand. (Learned from: far2l story markdown-browser-view, gate, 2026-11-06)
- **[browser]**: Each drawn diagram carries an accent pass. It sets inline `style` on child shapes only, and the pass adds no element. The `style` of the root `<svg>` stays unchanged. (Learned from: story mermaid-accent-coloring, spec, 2026-11-17)
- **[browser]**: The page reads the used mode from the `paletteMode()` pair `<palette>:<mode>` (mode after the colon) and the palette name from `paletteSetting()`. Both accent color tables are indexed by mode: `PALETTES.<palette>.<mode>[key]`, `GITHUB_ACCENTS.<mode>[i]`. (Learned from: story mermaid-accent-coloring, 2026-11-17)
- **[browser]**: The cluster of a node is the innermost `g.cluster` whose `rect` holds the node center: the smallest `width * height`. A tie keeps the later cluster in DOM order. Mermaid 12.3 puts `g.cluster` and `g.node` in sibling layers, so containment is geometry, not nesting. (Learned from: story mermaid-accent-coloring, 2026-11-17)
- **[browser]**: Cluster bounds come from the `rect` `x`/`y`/`width`/`height` attributes, not `getBBox()`. The viewer zoom sits on the root and does not skew them. (Learned from: story mermaid-accent-coloring, 2026-11-17)
- **[browser]**: Sequence actors take a positional accent in document order (`index % 8`). The paint target is `rect.actor, polygon.actor`: in mermaid 12.3 the `.actor` class sits on the box `rect` itself, which has no shape child. Messages, activations, and lifelines stay on theme colors. (Learned from: story mermaid-accent-coloring, 2026-11-17)

## Install and paths

- **[paths]**: md-view reads only `${XDG_CONFIG_HOME:-$HOME/.config}/md-view/config.ini`. It reads no file in the old far2l path, and it has no fallback. (Learned from: story md-view-repo, owner ruling, 2026-11-12)
- **[paths]**: `lib/md-view` reads its page code (`page.js`, `page.css`) and its vendored files from its own folder (`self_dir`). The install keeps the script, the two page files and the eleven vendored files together in `$PREFIX/share/md-view/`. (Learned from: story md-view-repo, spec, 2026-11-12)
- **[install]**: `PREFIX` is absolute and holds no single quote, because the installed launcher quotes the path with single quotes. `make install` replaces a symlink at `$PREFIX/bin/md-view` and does not write through it. (Learned from: story md-view-repo, T4, 2026-11-12)

## Tests

- **[tests]**: A test with no Chrome or no network prints `skip` lines and exits 0. A pass with `skip` lines proves less, so read them before you trust a pass. (Learned from: story md-view-repo, spec, 2026-11-12)
- **[palette]**: The Tokyo color layer sets colors only. Each rule starts with `html[data-palette]`, so it wins over the vendored styles by specificity. It has no `!important` and no `display` rule. The vendored files stay unmodified. (Learned from: story themes-tokyo-night, spec)

- **[tests]**: The page script stamps `data-line` and `id` on every rendered block, list item and table row. A test that greps the rendered markup must match the element and its text, not a full tag with a fixed attribute list. (Learned from: story line-anchor-nav, `tests/hostile-dom.sh`, 2026-11-18)
- **[style]**: A page rule that paints a background over rendered Markdown must win over the even table-row stripe and the Tokyo palette rules. A test of such a rule paints an even row and a Tokyo page. (Learned from: story line-anchor-nav, final review, 2026-11-18)

## Repo

- **[repo]**: Only `README.md`, `AGENTS.md`, `docs/`, the `--print-association` text and its tests, the old-config-path test, and git history name far2l. `git grep -i far2l` finds no other name. (Learned from: story md-view-repo, owner ruling, 2026-11-12)

## Cache

- **[cache]**: `page_fresh` reuses a cached page only when the head `key_line` matches the page the run would write, byte for byte. The `key_line` carries every setting and the version (`;v=`). A bump then rebuilds the page on its own, with no cache code and no file-time check. (Learned from: story md-view-version, spec, 2026-11-17)
