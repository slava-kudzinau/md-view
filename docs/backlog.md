---
description: Open items carried from retired stories - test gaps, manual checks and planned scope with no story yet.
status: ready
date: 2026-11-17
---

# Backlog

Open items that do not block a shipped story. Each names the story that left it.

## Tests

- One list names the page and vendored files in `lib/md-view`, the tests and the Makefile. Today the set is written in four places. (story page-assets)
- The exit 3 test loops the inlined files and stops at the first failure, so each file is proven only in list order. (story page-assets)
- uninstall has no test for a `%` in `PREFIX` (the Makefile addprefix/addsuffix rule); a manual check passed. (story md-view-repo)
- No test checks the text of the installed launcher (the Makefile builds it from `printf`). (story md-view-repo)
- The hostile file name (`"><script>.md`) holds no `;`, `|` or backtick. (story md-view-repo)
- No test checks `<!--` in a vendored file after an upgrade; the marked license note points at a test that skips. (story md-view-repo)
- Make the sample-config test assert the exact `palette=tokyo` line, not a regex. (story themes-tokyo-night)
- Test the `auto` re-apply of the palette and Reset; strengthen `bad_saved` to a full mutation check. (story themes-tokyo-night)
- Test the tokyo failure path with the new palette+theme pair. (story themes-tokyo-night)
- Test that the palette layer wins the cascade (a hand check covered 108 elements). (story themes-tokyo-night)
- Extend accent coloring to class, state and other diagram types beyond flowchart and sequence. (story mermaid-accent-coloring)
- Hover / click focus on diagram shapes. (story mermaid-accent-coloring)
- Add a `find`-call shim row that counts `find` calls on the scan path (`scan_tree`), and a row for an unreadable file over 1 MiB (or a spec "except" line). (story tree-scan-speed)
- No test covers a scan failure (`cannot read the file tree`, exit 2). Older than the story. (story tree-scan-speed)
- `cache_tree_grown_big` passes the mutant "every line of `tree_newer` is a folder" (F-2, accepted). Strengthen the row or accept it explicitly. (story tree-scan-speed)

## Manual checks

- A folder at `$PREFIX/bin/md-view` gives install exit 0 and leaves a temporary file. (story md-view-repo)
- The README Midnight Commander rule (`Regex=\.md$`) was checked against mc 4.8.33 headers only, never run in live mc. (story md-view-repo)

## Tooling

- Diagram screenshots: capture over DevTools (`Page.captureScreenshot`); headless `--screenshot` stacks the diagrams on tall pages. No shot script lives in `tests/`. (story themes-tokyo-night)

## Planned scope

- Story `md-view-remove`: remove the Markdown view from far2l. Users need md-view installed before far2l drops the view. (story md-view-repo)
- Laser pointer outside the diagram viewer: on normal-view text and on inline diagrams. The diagram-laser-pointer story kept it out of scope. (story diagram-laser-pointer)
