---
description: The testable spec of tree-scan-speed, with the scan and the cache check of a tree page and their exact values.
---

# Spec: tree-scan-speed

The lite plan held this spec in `plan.md`. The story moved to the standard tier after the final review, so the spec is now here. `plan.md` "## Spec" says the same.

## `lib/md-view`: the scan of a tree page

| Case | Result |
|---|---|
| A new tree page | One `find` walk lists the tree files and their byte sizes from `wc -c`. No tree file is read to count its size. |
| A tree file over 1048576 bytes | State `big`. |
| The opened file, then each tree file in tree order | Their byte sizes add up toward 8388608. A file that takes the total over 8388608 is `cut`. |
| Total of exactly 8388608 bytes | The last file is `page`. |
| Total of 8388609 bytes | The last file is `cut`. |
| A tree file that `wc` cannot read | Size 0 and state `page`, with an empty file element. Also when it is over 1 MiB. |
| A file with no final newline | It counts its real bytes, 1 byte less than before the story. |

## `lib/md-view`: reuse of a cached tree page

| Case | Result |
|---|---|
| Page exists, no input newer, head has the key line, the `config.ini` line and the `<base href>` line of this root, and no tree folder or tree file is newer than the page | The page is reused after one `find` walk. No scan, no `wc`. |
| Same, but a tree folder is newer and no tree file is newer | The scan runs. The page is reused if its head has the tree state line of this scan. |
| A tree file is newer than the page | The page is built again. |
| The root changed (for example `root=repo` and `.git` removed) | The `<base href>` line differs, so the page is built again. |
| The newer walk fails (for example an unreadable folder) | The page is built again. |
| A tree file is added, deleted or renamed and every folder time stays at or below the page time | The page is reused (a known limit, written in the spec "Parked findings"). `--no-cache` builds again. |
| `--out`, `--no-cache`, the fallback page, one-file mode, `--list-tree` | Same as before the story. |

## `tests/bench.sh`

| Case | Result |
|---|---|
| `sh tests/bench.sh` | Prints `new page: <s> s` and `cached page: <s> s` on a tree of 3,000 files. Exits nonzero if a run fails or the second run did not reuse the page. |

## Done

`make check` exits 0 with its `skip` lines read, and each row above is covered by a test in `tests/browser-page.sh`, except the bench rows (checked by running `tests/bench.sh`) and the known limit (a spec line).

## Out of scope

A split of `lib/md-view`, another language, a change to the 8 MiB limit, the 1 MiB limit or the 500-file cap, and the browser side.
