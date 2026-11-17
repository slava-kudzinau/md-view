---
description: The md-view version is one literal in the script, not a VERSION file, a git tag, or git describe.
status: accepted
date: 2026-11-17
---

# ADR-003: the version literal

## Context

- md-view shows a version string in the settings-menu footer and prints it with `--version`.
- The tool is installed by `make install` as plain files, with no git metadata next to them.

## Decision

One literal `version=0.1.0` lives in `lib/md-view`. It is the single source of truth: the script injects it as a `<meta name="md-view-version">` in the page head and prints it for `--version`. It also folds into the page key (`;v=`), so a version bump invalidates a cached page on its own, with no change to the cache code.

## Consequences

- The installed copy reports the version it was built with, with no dependency on git.
- A bump is one edit in one file; the footer, the `--version` text and the cache key all follow.
- The version is not a build-time stamp; it changes only when a person edits the literal.

## Rejected alternatives

### A `VERSION` file

**Why rejected:** a second file to keep in step with the script for one value. The literal sits beside the code that reads it.

### A git tag, or `git describe`

**Why rejected:** the installed copy has no git, so it would report the wrong version or fail.
