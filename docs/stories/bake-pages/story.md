---
description: Bake every tree file to its own linked HTML page so a script-free preview shows content and working navigation.
status: done
size: M
depends-on: prerender-content
risk: contract
refs: ADR-001
---

# Story: bake-pages

## Goal

A folder of Markdown files, baked with `--bake pages`, becomes one HTML page per file with links between them. A SharePoint preview, or any static host, shows the text, the code, the diagrams, and a working file tree. The proof-of-concept `--bake` writes one page whose tree links are inert in SharePoint, because the preview paging eats the `#/route` clicks. Pages mode gives each file a real sibling link.

## Context

- The bake proof of concept (story `prerender-content`, branch `feat/prerender-content`) runs the built page through headless Chrome `--dump-dom` and writes the baked DOM. It keeps the inline scripts, so a `file://` page stays interactive. This story builds on that flag.
- SharePoint's one-up preview uses `<iframe sandbox="allow-scripts">`. The inline scripts run, so the page paints. The tree links use a hash route that the preview paging intercepts.
- Spec: `docs/architecture/md-view.spec.md`, the SharePoint preview row (line 152) and the Flags table (line 57).
- Nav is built at runtime by `buildTree` in `lib/page.js` (line 356), from the `#md-tree` index that `page_files` emits in `lib/md-view` (lines 583-585). The bake pass serializes that nav into the written page.

## Scope

**In:**
- Superseded by the plan's Spec (`plan.md`): `--bake <dir>` writes one `index.html`, mirrors the assets, and keeps the hash routes. The rows below name the pages mode the story first planned.
- `--bake pages` as a value of the `--bake` flag (the value-taking shape of `--width` at `lib/md-view:626`). Bare `--bake` keeps today's single-page output.
- A pages nav mode. The emitter writes `<html data-nav="pages">`. `buildTree` emits `href="<target>.html"` in pages mode and the `#/route` form otherwise (`lib/page.js:356`).
- The bake pass bakes every file in the tree, one Chrome run per file, on the opened file's tree. It runs in tree mode; in one-file mode it writes one page.
- The baked page name is `<folder-slug>-<base>-<crc>.html`. `folder-slug` is the file's folder path with `/` folded to `-`, so same-named files in sibling folders keep distinct names in a flat host. `base` and `crc` reuse the cache naming in `lib/md-view` (lines 793-799).
- Freshness reuses the cache head-meta check (`page_fresh`, `lib/md-view:875-912`). `--bake pages` bakes a file only when its baked page is not fresh. Nav links point at each target's current name, so the set stays consistent after an edit.
- Docs: a `--bake pages` row in the spec Flags table and the README Flags table; one sentence on the SharePoint preview row naming pages mode.

**Out:**
- Superseded by the plan's Spec (`plan.md`): the bake writes one `index.html` with mirrored assets, not per-file pages.
- A `--lean` bake (strip the inline scripts, 79 KB, for a script-free preview). A later story.
- Per-file bake for a single file outside a tree. The opened file's tree is the unit.
- The tree-panel compact/resize work (story `tree-panel-compact-resize`). It edits the same `buildTree` region; the two run in series on that region.

## Size

M. Signals: one new flag value, one `buildTree` href branch, a per-file loop in the bake pass, and cache-name reuse. The story adds one test row and doc rows. No new vendored file. One contract change: the nav `href` shape gains a pages form.

## Unknowns

- How `page.js` learns each sibling's content-named filename at bake time, so `buildTree` can emit `href="<target>.html"` with the baked name. The chosen route is a data manifest the bake pass fills (for example a `data-page` value per tree item). `design.md` decides it.
- How `--out` composes with pages mode. `--out` names one page; pages mode writes many. The brief assumes `--out <dir.html>` is a folder, one file per tree file. The first task confirms it against the `--out` cache branch at `lib/md-view:782`.

## Acceptance criteria

- `--bake pages` on a two-file tree writes two `.html` files, named `<folder-slug>-<base>-<crc>.html`, in the target folder.
- Each written page has a baked `<main id="content">` with a child node. Its nav `<a>` names the sibling's baked file, not a `#/route`. Read it from the file text with no script.
- Bare `--bake` (no value) keeps the single-page output: one `.html` with the `#/route` nav.
- Editing one file changes its `<crc>`, so its page name changes, and a re-bake rewrites every inbound nav link to the new name.
- A file whose baked page is fresh is reused, not re-rendered.
- With no Chrome, the pages are written unbaked with one stderr note, exit 0.
- `make check` passes. A new `case_page_bake_pages` row in `tests/browser-page.sh` proves the two-file bake, the relative nav, and the baked `<main>` from the file text.
- Close-out docs: the spec Flags table, the spec SharePoint preview row, and the README Flags table. Update `docs/architecture/md-view.invariants.md`: a baked pages set is consistent after an edit.

## Notes

Owner decisions, 2026-11-20:
- Pages mode + per-file bake, chosen over a post-hoc href rewrite. (Approach A.)
- Flag shape `--bake pages`; bare `--bake` keeps the single page.
- Output name `<folder-slug>-<base>-<crc>.html`, content-addressed, chosen over a timestamped snapshot.
- Rebuild scope: bake every file each run, reuse a fresh baked page.

Branch `feat/bake-pages`, base `feat/prerender-content` (the bake proof of concept). Budget for M per `AGENTS.md`; hard stop at the size cap, then split.

Check command: `make check` from the repo root, then `sh tests/browser-page.sh | grep bake_pages`.
