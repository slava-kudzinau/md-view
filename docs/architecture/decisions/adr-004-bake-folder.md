---
description: A baked site is one mirrored folder with index.html, not a flat folder with an asset manifest.
status: accepted
date: 2026-11-20
---

# ADR-004: one mirrored folder for a baked site

## Context

- The SharePoint one-up preview parses the inline script elements inert, so text, code, and diagrams of a plain md-view page stay empty there.
- `--bake <dir>` renders the page once with headless Chrome and writes `index.html`, so a preview shows them with no script run.
- A baked page also shows its images and links. Their files live in folders next to the Markdown file, and a page tree can name files in many folders.
- The tool must keep POSIX `sh` and a small tool set: `sh`, `awk`, `sed`, `grep`, `find`, plus the file tools.

## Decision

A baked site is one mirrored folder. `<dir>/index.html` holds the rendered page, and each published asset sits under the same root-relative path it has under the tree root. The bake copies run after the page write and before the render, so the render output and the assets share one finished folder.

## Consequences

- `<base href="./">` makes every root-relative target read correctly, with no rewrite of the rendered DOM.
- A reader of the baked folder sees the layout of the source root. A name in the text points at a file they can find.
- The folder is one unit to upload, copy, and delete.
- A deep tree makes deep folders in the bake folder, up to `tree_depth`.
- Two page files that name the same asset need no rename: the path is the name, and the copy is once.

## Rejected alternatives

### A flat folder with an asset manifest

Put every asset in the bake folder root, and point each `src` and `href` at its new name through a manifest.

**Why rejected:** The manifest needs a second pass over the rendered DOM. A name that repeats also needs a new name and a map in the page.

The mirrored folder needs neither. The browser resolves the paths on its own. Revisit it when a host caps folder depth, or needs a flat upload list.
