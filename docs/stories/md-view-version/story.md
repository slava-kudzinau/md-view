---
description: Gives md-view a version string, shown in the settings menu and printed by a --version flag, from one source of truth.
status: planned
size: S
refs: docs/architecture/md-view.spec.md
---

# Story: md-view-version

## Goal

A reader can see which md-view built a page. The version shows in the settings
menu (the gear popover) and `md-view --version` prints it on the command line.
One value feeds both, so they never disagree.

## Context

- `lib/md-view` assembles the page in a heredoc and already injects one meta,
  `md-view-key` (see the `key_line` line). The version rides the same path.
- `lib/page.js` `buildPopover` builds the gear menu rows (Width, Style, Theme,
  keys, Reset). A footer line joins them.
- No version exists today: no git tags, no CHANGELOG, no VERSION file.

## Scope

**In:**
- One literal `version=0.1.0` in `lib/md-view` as the single source of truth.
- A `--version` flag: prints `md-view 0.1.0`, exits 0, before any config read.
- A `<meta name="md-view-version" content="0.1.0">` in the written page, next
  to the `md-view-key` meta.
- A muted footer line in the settings popover showing `md-view 0.1.0`, read
  from that meta (fallback `md-view` when the meta is absent).
- The spec's settings/menu section, the page-meta note, and the README flag
  list updated in step.

**Out:**
- A CHANGELOG, a git tag, a `VERSION` file, and an auto-increment scheme.
- A version in the page title, the file tree, or anywhere other than the menu.
- A per-build commit-hash suffix; the value is a fixed string.

## Size

S. One literal, one meta injection, one flag branch, one popover footer, plus
the spec, README, and two test assertions. No new tool, no new vendored file.

## Unknowns

None material. Confirm the footer sits at the bottom of the popover (below
Reset); it is cosmetic.

## Acceptance criteria

- `md-view --version` writes `md-view 0.1.0` to stdout and exits 0, and reads
  no config file.
- The written page carries `<meta name="md-view-version" content="0.1.0">`.
- Opening the gear menu shows a footer line whose text is `md-view 0.1.0`.
- Changing the single literal changes all three (flag, meta, menu) together.
- A version bump with unchanged inputs rebuilds the page (the key token changes),
  not a stale cache hit; `md-view --no-cache` and the default path agree.

## Notes

The version string is untrusted-input-safe: it is a fixed literal, set with
`textContent` in the page, and is a plain `printf` on the CLI.
