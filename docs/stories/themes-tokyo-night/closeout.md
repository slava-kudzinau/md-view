# Close-out draft: themes-tokyo-night

Commits: cdd70bf T1 palette setting in the script. de9bf3a T2 palette in the page script. 3afeee9 T3 color layer. f960683 T4 mermaid with the palette. d7979a7 T5 README. Check: `make check` exit 0 (no skip line; Chrome and network rows ran).

The 6 shots are in `.build/shots/` (ignored by git): sample-tokyo-dark, sample-tokyo-light, sample-github-dark, diagrams-tokyo-dark, diagrams-tokyo-light, diagrams-github-dark. To see a Tokyo Night page: `lib/md-view --palette tokyo --theme dark tests/browser-page/sample.md`.

## Rulings

1. The layer has two extra color rules. The spec did not list them. `pre.mermaid` keeps `background: none`. `.hljs-emphasis` and `.hljs-strong` get `color: inherit`. Reason: no foreign github color inside a tokyo page. The story spec has no row for them.
2. The spec row "Tree button, gear" is split in two. `#md-gear` is in the main style block. `#md-tree-toggle` is in the tree block. A one-file page has no tree rule.
3. The redraw state `drawnTheme` holds one string, `palette:mode` (for example `tokyo:dark`), from `paletteMode()`.
4. `applyPalette()` removes the `--p-` variables of every entry of `PALETTES`, so a new palette is still one table row.
5. The diagram screenshots use a real-time DevTools capture. Headless `--screenshot` stacks the diagrams. It does the same with github at the old code. No change to `lib/md-view` was made for it.
6. Existing tests changed in step with the code: exact-tag helper `expect_tag W T P F`, `page_paste_line`, `page_mermaid_theme_hook`, `tree_off_same_page`.

## Parked findings

- T1 Minor: the sample-config test uses a regex, not the exact line.
- T2 Minor: no test for the `auto` re-apply or for Reset (the spec rules Reset out). `bad_saved` row is weaker than a full mutant check.
- T3: `.hljs-addition` and `.hljs-deletion` keep the vendored tinted background. The `kbd` shadow keeps a github color. `kbd` cannot come from Markdown, because raw HTML is escaped. `a:not([href])` gets cyan. A hovered current tree file stays `fg`.
- T4 Minor (3): no test of the failure path with the new pair. The tokyo draw rows match the color text anywhere in the block. One screenshot note.
- T5: the gantt section band in Night is a neutral grey from mermaid; the pie percent labels in Day have low contrast.
- Final Minor: no test proves that the layer wins the cascade. A hand check in Chrome covered 108 elements. A dark palette prints light text, the same as github dark today.
- Final Minor for the owner: the final reviewer saw `AGENTS.md` and `.gitignore` in the branch diff (commit 4c719e1, the worktree rule, made before the build). Confirm that this commit belongs in the PR.

## For the main session at close-out

- Update `docs/architecture/md-view.spec.md` (config keys, start attributes, paste lines, mermaid theme text, key line with `p=`, keys line with `s`). The final review lists lines 78, 105, 141, 150 and 192 as stale.
- Add an invariant for the layer: colors only, every rule starts with `html[data-palette]`, no `!important`. Write an ADR only if the palette table outlives the story.

## Lessons

- The implementer role (haiku) did all five tasks with no fix round and no Critical or Important finding. Keep it.
- A DOM test cannot seed localStorage before first load; the sessionStorage-guarded reload worked.
- Headless `--screenshot` with mermaid needs a DevTools capture for tall pages.

## Review yield

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| task-reviewer-critical | opus | 3 | 0 | 0 | 6 |
| final-reviewer | opus | 1 | 0 | 0 | 4 |
