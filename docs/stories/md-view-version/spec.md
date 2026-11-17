# Spec: md-view-version

One version string, `0.1.0`, lives once in `lib/md-view` as `version=0.1.0`. The
`--version` flag, the page meta, the cache key, and the settings-menu footer all
read that one value.

## `lib/md-view`: the flag and the page head

| Call | Result |
|---|---|
| `md-view --version` | Writes `md-view 0.1.0` to stdout, exits 0, and reads no `config.ini`. |
| The written page head | Carries `<meta name="md-view-version" content="0.1.0">`, after the `md-view-key` and `md-view-ini` lines. |
| The page key meta | `content="w=<width>;t=<theme>;p=<palette>;f=<0 or 1>;tr=<on or off>;r=<root mode>;d=<depth>;n=<max files>;v=0.1.0"`, the old token list with `;v=0.1.0` appended. |
| A version bump with no other change | The next run rebuilds the page (the key line differs), then reuses it. |

The flag branch comes before the config read, so `--version` is independent of
`config.ini`. The version token joins the key content, so a bump invalidates a
cached page on its own, with no reliance on file times.

## `lib/page.js`: the settings-menu footer

| Call | Result |
|---|---|
| The gear popover opens | It ends with a muted line `md-view 0.1.0` below Reset. |
| The page has no `md-view-version` meta | The footer reads `md-view` (no version). |

## Done

`make check` exits 0. Every table row above is covered. `--version` and the page
meta run in `tests/launcher.sh` and `tests/browser-page.sh`. The key token runs in
the key-line greps of `tests/browser-page.sh`. The footer runs in the DOM checks of
`tests/browser-page.sh`.

## Out of scope

A CHANGELOG, a git tag, a `VERSION` file, an auto-increment scheme, a per-build
commit-hash suffix, and a version shown anywhere other than the settings menu.
