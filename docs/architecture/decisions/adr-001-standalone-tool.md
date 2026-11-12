---
description: The Markdown browser view is a standalone shell tool, md-view, with its own repo, install, config path and docs.
status: accepted
date: 2026-11-12
---

# ADR-001: md-view as a standalone tool

## Context

- md-view began as `md-open.sh` in the far2l fork. far2l ADR-005 (2026-11-05) made it an external script that Alt-F3 runs through File associations.
- The terminal Markdown view cannot draw every diagram well. A browser draws every mermaid diagram type, so it is the fallback for what the terminal cannot draw.
- The Markdown file can come from anywhere.
- Other tools run an external viewer in the same way. Midnight Commander does this through `mc.ext`.
- The owner decided to keep the tool in a separate repo, so that far2l has no knowledge of it and the user installs md-view separately.

## Decision

md-view is a standalone POSIX shell tool in its own repo. `md-view <file.md>` writes one `.html` page and opens it in a browser. Any tool that runs an external viewer can call it.

These rules come from far2l ADR-005 and still hold.

- The page is `${XDG_CACHE_HOME:-$HOME/.cache}/md-view/<base>-<cksum>.html`. The name comes from the real path of the file, so it is the same for each run. The folder has mode 700. The script writes a temporary file and moves it over the page. It opens the old page with no build while no input is newer and the key of the page matches. If the cache folder cannot be used, the script writes `${TMPDIR:-/tmp}/md-view-<pid>.html`. `--out <page>` writes that path directly.
- The start width (60, 70, 80), the theme (light, dark, auto) and the browser come from `${XDG_CONFIG_HOME:-$HOME/.config}/md-view/config.ini`, section `[View]`. A flag acts for one run and beats the file. A width or a theme reaches the page only as an accepted word.
- The script starts the browser directly with `exec`, from a checked name or an absolute path, and never through `eval` or `sh -c`. `browser=` is `auto`, `firefox`, `chrome`, `safari` or an absolute path.
- The page holds the Markdown text, the vendored `marked.min.js` and `highlight.min.js`, four vendored style files and a short stylesheet. The script inlines them, so the policy does not name them. The page loads mermaid 12.3.0 from the jsdelivr CDN with an `integrity` hash and starts it with `securityLevel:'strict'`. A `Content-Security-Policy` meta allows inline scripts, scripts from all of `https://cdn.jsdelivr.net`, and local images only. The text shows first, so a slow or blocked CDN never blanks the page. Raw HTML in the Markdown shows as text.
- Tree mode puts every Markdown file of the root in one page, because a `file://` page cannot read another local file. The page script routes `#/ENC` to a file and checks each link against the root.

This split changes these things.

- The command is `md-view`, and `make install PREFIX=...` puts it in `$PREFIX/share/md-view/` with a launcher in `$PREFIX/bin/md-view`.
- The config is `.../md-view/config.ini` and the cache is `.../md-view/`. md-view reads no file in the old far2l paths. A user moves the old file by hand. The README says how.
- `md-view --print-association` still prints the far2l File associations entry, with the absolute path of the launcher. The `mc.ext` rule is in the README only.
- The page key meta, the head comments and the `localStorage` keys use `md-view-` in place of `far2l-md-`. A saved page choice from the old names is lost once.

## Consequences

- far2l needs no code for this view. A user installs md-view and adds one entry.
- Diagrams need internet. Without it, each diagram shows its source.
- The policy trusts the whole jsdelivr host for scripts. The pin of the URL and the hash is in the page script only.
- Remote images do not load. This stops the file from sending the reader IP address to a remote host.
- A page is opened again with no build while no input changed. The reuse rule uses the modification time of the Markdown file only.
- The cache folder keeps one page for each Markdown file that the user opened. The script does not delete them.
- The vendored files must stay in the folder of the script. A missing file gives exit 3.
- A test with no Chrome or no network prints `skip` lines and passes. A reader must look at the `skip` lines.

## Rejected alternatives

### Keep the script in far2l

**Why rejected:** far2l would ship and test a tool that other file managers can use as well. Revisit if far2l needs a viewer that it can start with no install.

### Markdown to HTML in C++

**Why rejected:** the script stays small and POSIX with `marked`, and no native tool is added.

### A local web server, or the 5 MB `mermaid.min.js` in the repo

**Why rejected:** nothing to start or stop, and no large file to ship. The owner chose the CDN on 2026-11-06. Revisit if offline diagrams become a need.

### A fallback to the old far2l config and cache paths

**Why rejected:** the owner ruled for own paths with no fallback. One path is simpler to test and to explain.

### Loose mermaid security, or remote images allowed

**Why rejected:** the file may come from anywhere.
