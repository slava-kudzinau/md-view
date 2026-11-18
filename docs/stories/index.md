---
description: The list of md-view stories in build order, with the status of each and the reason for the order.
---

# Stories

| Order | Story | Size | Status | Depends on |
|---|---|---|---|---|
| - | [md-view-repo](md-view-repo/story.md) | M | retired | - |
| - | [themes-tokyo-night](themes-tokyo-night/story.md) | M | retired | - |
| 1 | [page-assets](page-assets/story.md) | S | retired | - |
| 2 | [mermaid-viewer](mermaid-viewer/story.md) | M | retired | page-assets |
| 3 | [mermaid-accent-coloring](mermaid-accent-coloring/story.md) | M | retired | mermaid-viewer |
| 4 | [mermaid-accent-toolbar](mermaid-accent-toolbar/story.md) | M | planned | mermaid-accent-coloring |
| 5 | [md-view-version](md-view-version/story.md) | M | retired | mermaid-viewer |
| 6 | diagram-laser-pointer | S | retired | - |
| 7 | [line-anchor-nav](line-anchor-nav/story.md) | M | done | diagram-laser-pointer |
| 8 | [tree-panel-compact-resize](tree-panel-compact-resize/story.md) | M | planned | - |
| 8 | [tree-scan-speed](tree-scan-speed/story.md) | S | planned | line-anchor-nav |

## Build order

1. **page-assets** comes first. It moves the page script and style into `lib/page.js` and `lib/page.css`, with no change to the written page. The viewer then adds its code to plain files.
2. **mermaid-viewer** edits `lib/page.js`, `lib/page.css` and the spec section on diagrams, so it starts after page-assets merges. The two stories edit the same code, so they do not run in parallel.
3. **mermaid-accent-coloring** adds an accent pass to the drawn diagram. It edits `lib/page.js` and the spec diagram section, so it starts after mermaid-viewer merges.
4. **mermaid-accent-toolbar** adds the scheme picker on top of the accent pass, so it starts after mermaid-accent-coloring merges.
5. **md-view-version** adds a version string, a `--version` flag, a page meta, and a settings-menu footer. It touches `lib/md-view`, the popover region of `lib/page.js` and `lib/page.css`, the spec menu section, and the README. It is independent of the mermaid chain and can run in parallel.
6. **diagram-laser-pointer** adds a laser pointer to the diagram viewer: a `●` toolbar button and key `l` toggle a red dot that follows the pointer. It runs in series with `mermaid-accent-toolbar`: both edit `.md-vtools` in `lib/page.js` and the spec Keys row. It goes first: it is the smaller story, and it clears the toolbar and keys lines that the accent toolbar then edits.
7. **line-anchor-nav** adds line anchors (`#L85`, `#L85-90`) to the page: stamps in `show()`, grammar in `scrollToFrag`, new `tests/browser-links-dom.sh` rows. It runs after diagram-laser-pointer merges: both edit `lib/page.js` and the spec Tests table, in regions that do not overlap. It runs in parallel with `mermaid-accent-toolbar`, which edits the viewer regions of the same files.
8. **tree-panel-compact-resize** makes the tree panel readable in a narrow width: rails, chevrons, chain rows, ellipsis, and a resizable saved width. It edits the tree regions of `lib/md-view` and `lib/page.js` and the tree cases of both browser tests. It runs in parallel with `mermaid-accent-toolbar`: the files are shared, the regions do not overlap.
9. **tree-scan-speed** makes a tree page open fast on a large folder. It edits the scan and the cache check in `lib/md-view` and adds rows to `tests/browser-page.sh`. The story line-anchor-nav edits the same two files. So this story starts after line-anchor-nav merges.
