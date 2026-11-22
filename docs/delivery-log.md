---
description: One row for each retired story, with its size, its cost against the budget, the review yield and the commit that still holds its folder.
---

# Delivery log

"Folder at" is the last commit that holds the story folder. To read a file of the story: `git show <sha>:<folder>/closeout.md`.

| Story | Size | Risk | PR | Merge | Folder at | Budget | Stop | Subtree | Main | Total | Verdict | Reviews | Retired | Flags |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| md-view-repo | M | contract, migration | 0 | ee5a918 | `ee5a918` | - | - | - | - | - | - | C0 I3 M21 | 2026-11-17 | no cost record |
| themes-tokyo-night | M | contract | 1 | 75cd7ca | `75cd7ca` | $15.00 | $20.00 | $8.18 | $2.59 | $10.77 | ok | C0 I0 M10 | 2026-11-17 | verdict on the subtree only |
| page-assets | S | contract | 2 | 699f45c | `699f45c` | $8.00 | $10.00 | $3.53 | $2.45 | $5.98 | ok | C0 I1 M5 | 2026-11-17 | verdict on the subtree only |
| mermaid-viewer | M | contract | 3 | 811ca07 | `811ca07` | $15.00 | $20.00 | $7.56 | $3.93 | $11.48 | ok | C0 I2 M14 | 2026-11-17 | verdict on the subtree only |
| mermaid-accent-coloring | M | contract | 5 | b954259 | `3d0bd05` | - | - | - | - | - | - | C0 I1 M5 | 2026-11-17 | no cost record |
| md-view-version | M | - | 6 | 9bd64b2 | `36b0814` | - | - | - | - | - | - | C0 I1 M9 | 2026-11-17 | no cost record |
| diagram-laser-pointer | S | none | 8 | 4e2b238 | `a07442d` | - | - | - | - | - | - | C0 I1 M3 | 2026-11-18 | no cost record |
| tree-scan-speed | S | none | 15 | d9357ed | `1aba21a` | $8.00 | $10.00 | $4.28 | $3.01 | $7.29 | ok | C0 I1 M10 | 2026-11-21 | verdict on the subtree only |
| line-anchor-nav | M | contract, security | 10 | 4d766ba | `f98a7ae` | $10.37 | $15.37 | $5.91 | $5.93 | $11.83 | ok | C0 I5 M7 | 2026-11-21 | verdict on the subtree only |
| tree-panel-compact-resize | M | contract | 13 | 761bf0c | `90c619a` | - | - | - | - | - | - | C1 I0 M1 | 2026-11-21 | no cost record |
| mermaid-text-selection | S | - | 20 | 15669c7 | `a36bfab` | $8.00 | $10.00 | $0.00 | $0.00 | $0.00 | ok | C0 I0 M1 | 2026-11-22 | - |
