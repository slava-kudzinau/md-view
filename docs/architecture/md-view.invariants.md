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

## Install and paths

- **[paths]**: md-view reads only `${XDG_CONFIG_HOME:-$HOME/.config}/md-view/config.ini`. It reads no file in the old far2l path, and it has no fallback. (Learned from: story md-view-repo, owner ruling, 2026-11-12)
- **[paths]**: `lib/md-view` reads its vendored files from its own folder (`self_dir`). The install keeps the script and the nine vendored files together in `$PREFIX/share/md-view/`. (Learned from: story md-view-repo, spec, 2026-11-12)
- **[install]**: `PREFIX` is absolute and holds no single quote, because the installed launcher quotes the path with single quotes. `make install` replaces a symlink at `$PREFIX/bin/md-view` and does not write through it. (Learned from: story md-view-repo, T4, 2026-11-12)

## Tests

- **[tests]**: A test with no Chrome or no network prints `skip` lines and exits 0. A pass with `skip` lines proves less, so read them before you trust a pass. (Learned from: story md-view-repo, spec, 2026-11-12)
- **[palette]**: The Tokyo color layer sets colors only. Each rule starts with `html[data-palette]`, so it wins over the vendored styles by specificity. It has no `!important` and no `display` rule. The vendored files stay unmodified. (Learned from: story themes-tokyo-night, spec)
