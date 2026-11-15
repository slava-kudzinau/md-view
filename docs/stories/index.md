---
description: The list of md-view stories in build order, with the status of each and the reason for the order.
---

# Stories

| Order | Story | Size | Status | Depends on |
|---|---|---|---|---|
| - | [md-view-repo](md-view-repo/story.md) | M | in-review | - |
| - | [themes-tokyo-night](themes-tokyo-night/story.md) | M | in-review | - |
| 1 | [page-assets](page-assets/story.md) | S | in-review | - |
| 2 | [mermaid-viewer](mermaid-viewer/story.md) | M | planned | page-assets |

## Build order

1. **page-assets** comes first. It moves the page script and style into `lib/page.js` and `lib/page.css`, with no change to the written page. The viewer then adds its code to plain files.
2. **mermaid-viewer** edits `lib/page.js`, `lib/page.css` and the spec section on diagrams, so it starts after page-assets merges. The two stories edit the same code, so they do not run in parallel.
