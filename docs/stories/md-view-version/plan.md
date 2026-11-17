# Plan: md-view-version

Spec: `spec.md` (governs exact values). No `design.md` (the plan carries the design).

## Global Constraints

- POSIX `sh` only for `lib/md-view`; no new tool, no new vendored file.
- The single source of truth is one literal in `lib/md-view`: `version=0.1.0`, set
  after `LC_ALL=C`/`export LC_ALL` (near line 32). Every consumer reads `$version`.
- The flag prints exactly `md-view 0.1.0` to stdout and `exit 0`. The branch is the
  first arm of the argument `case` (before `--print-association`, near line 589), so
  it runs before any `config.ini` read.
- The key line (`lib/md-view:821`) appends `;v=$version` to the content, after
  `n=$tree_max`, before the closing `">`. `tests/browser-page.sh` asserts the full key
  content with `grep -qxF` in 24 places; every one gains `;v=0.1.0` before `">`.
  The key that `viewer_map` builds at `tests/browser-page.sh:2341` ends in `;n=500">`
  and gains `;v=0.1.0` there too.
- Cache invalidation comes for free: `page_fresh` (`lib/md-view:867`) greps the exact
  `key_line` in the head of the existing page, so a `;v=` change makes the next run
  rebuild. No cache code changes; the key append is the mechanism.
- The page meta is `<meta name="md-view-version" content="0.1.0">`, emitted by the
  head `printf` at `lib/md-view:930`, after `$ini_line` (extend that `printf` to a
  third `%s\n`).
- The footer (`lib/page.js`, `buildPopover`, after the Reset append at 1154, before
  `refresh()`) is a `p` with `class="md-version"`; its `textContent` is `md-view `
  plus the `md-view-version` meta's `content`, and `md-view` when the meta is absent.
- Style `lib/page.css`: `.md-version` is a muted footer (small font, dim color) that
  matches the muted tone of the existing `.md-notice`.
- Docs in step: add the `v=` token to the Key row of
  `docs/architecture/md-view.spec.md:200` and a Version meta row; add a `--version`
  row to the README flag table (near `README.md:47`).
- Commit message: a short imperative summary line, blank line, body; no trailer. One
  commit per task.
- Check: `make check`. Owner-checked paths: none (the builder updates spec, README,
  and tests in step).

## T1: version literal, `--version` flag, README

**Depends on:** none
**Done check:** `sh tests/launcher.sh` exits 0 (it runs `md-view --version`, checks
the output and exit 0, and shows the flag reads no `config.ini`)
**Role:** implementer — review final
- In `lib/md-view`, add `version=0.1.0` after `export LC_ALL` (near line 32).
- Add a `--version)` arm as the first case in the argument loop (near line 589):
  `printf 'md-view %s\n' "$version"; exit 0`.
- Add `md-view --version` to `usage()` (after the `--print-association` line, 48).
- Add a `--version` row to the README flag table (near `README.md:47`): "Print the
  version, and exit."
- In `tests/launcher.sh`, add a case: `md-view --version` prints `md-view 0.1.0`,
  exits 0, and works with a `config.ini` that sets a known value (so the flag reads no
  config). Use the existing launcher-test harness.

## T2: key token and page meta

**Depends on:** T1
**Done check:** `sh tests/browser-page.sh` exits 0 (the 24 key-line greps and the new
meta assertion pass)
**Role:** implementer — review task-reviewer-critical (a public page contract, 24 edit sites)
- In `lib/md-view:821`, append `;v=$version` to the `key_line` content, after
  `n=$tree_max`.
- In `lib/md-view:930`, extend the head `printf` to emit a third line,
  `<meta name="md-view-version" content="$version">`, after `$ini_line`.
- Update the 24 full-content key greps in `tests/browser-page.sh` to carry `;v=0.1.0`
  before `">`, and the key that `viewer_map` builds at `:2341`.
- Add one assertion to a `browser-page.sh` page test: the written page carries
  `<meta name="md-view-version" content="0.1.0">`.
- Add the `v=` token to the Key row of `docs/architecture/md-view.spec.md:200`.

## T3: settings-menu footer

**Depends on:** T2
**Done check:** `sh tests/browser-page.sh` exits 0 (a DOM check opens the popover and
asserts the footer reads `md-view 0.1.0`)
**Role:** implementer — review final
- In `lib/page.js`, `buildPopover` (after the Reset append at 1154, before
  `refresh()`): append a `p` with `class="md-version"`. Read
  `document.querySelector('meta[name="md-view-version"]')`; when present,
  `textContent = 'md-view ' + m.content`; else `textContent = 'md-view'`.
- In `lib/page.css`, add `.md-version` as a muted footer (dim color, small font, a
  top rule to set it off), consistent with `.md-notice`.
- Add a `browser-page.sh` DOM check: after the popover opens, the page shows a
  `.md-version` element whose text is `md-view 0.1.0`.
- Add a Version meta row to `docs/architecture/md-view.spec.md` (the page-head section)
  and a line in the spec's settings-menu section for the footer.
