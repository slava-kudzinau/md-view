---
description: Add a palette setting to the md-view page, so a reader can pick a named color set. Tokyo is the first new palette, with a day and a night version, for the page text, the code blocks and the mermaid diagrams.
status: planned
size: M
risk: contract
refs:
  - docs/architecture/md-view.spec.md
  - docs/architecture/md-view.invariants.md
---

# Story: themes-tokyo-night

## Goal

Today the page has one color set, the GitHub style, in a light and a dark version. A reader who works in a Tokyo Night editor wants the same colors in the page. More color sets will follow. This story adds a setting that picks a color set. Tokyo is the first new one. A later story adds the next one as data, not as new code.

## Context

- A **palette** is a named set of colors. It has a light version and a dark version. GitHub is the palette that the page has today. Tokyo is the new one: Tokyo Day is its light version and Tokyo Night is its dark version.
- The setting `theme` stays as it is. It means the mode: `light`, `dark` or `auto`. `auto` follows the system.
- The page holds one light and one dark GitHub style, and one light and one dark highlight theme. The page script enables one of each pair with the `media` attribute (`applyTheme` in `lib/md-view`).
- The mode appears in the flag `--theme`, in `config.ini`, in the saved page choice (`md-view-theme`), in the popover and on the `t` key. See the spec section "The page: look, gear and keys".
- Mermaid starts with `securityLevel:'strict'` and `theme` set to `dark` or `default`. The pinned script and its SRI hash must not change (AGENTS.md, global policies).
- `github-markdown-dark.css` and `github-markdown-light.css` are vendored files with fixed colors, not CSS variables. They stay unmodified, so a palette is a layer of rules on top of them.

## Scope

**In:**

| Part | What changes |
|---|---|
| Setting | A new setting `palette`, with the words `github` (the default) and `tokyo`. It works with every mode: Tokyo and light is Tokyo Day, Tokyo and dark is Tokyo Night, Tokyo and `auto` follows the system. |
| Palette table | One table in the page script holds one row for each palette. A row holds a light color set and a dark color set. The page layer, the code colors and the mermaid variables all come from these colors. A new palette is a new row. |
| Page colors | For `tokyo`, a layer of rules on top of the GitHub style: background, text, links, headings, code, quotes, tables and borders. |
| Code colors | Token colors for `tokyo` in the code blocks, written as rules from the palette. |
| Mermaid | Diagrams use mermaid `theme:'base'` with `themeVariables` from the palette. `securityLevel:'strict'` and the pinned script stay as they are. A change of palette or mode draws the diagrams again. |
| Page controls | The popover gets a Style row. The page gets a key `s` that changes the palette. |
| Tree panel and popover | These use the palette colors. The left file tree panel: background, border, text, hover, current file and the open and close button. The gear. The popover: buttons and notices. Today they use the system colors `Canvas`, `Highlight` and `GrayText`. Only the mode changes them. |
| Surfaces | The flag `--palette`, the `palette=` key in `config.ini`, the saved choice `md-view-palette`, the usage text and the sample config. |
| Docs and tests | The spec, the README and the tests change with the contract. One focused test proves the new word reaches the page, and that a bad word is still refused. |

**Out:**

- A second new palette. The palette table must make it cheap to add. This story adds Tokyo only.
- Tokyo Storm.
- A user file with custom colors.
- Any change to the pinned mermaid script, its SRI hash, the CSP meta, the raw HTML escape or the block of remote images.
- Editing a vendored file.

## Size

M. One script, one new setting at six places, one mermaid setting, the spec, the README and the tests. One contract grows (a new setting). The values of `theme` do not change, so an old config keeps working. No new tool.

## Unknowns

1. **Mermaid coverage.** `themeVariables` may not color every diagram type well (flowchart, sequence, class, state, gantt, pie). A spike renders one diagram of each type with the Tokyo variables, and the owner looks at the result.
2. **Real colors.** The Tokyo Day and Tokyo Night values must come from the official source, not from memory. The spec step records each value and its source.
3. **Size of the page layer.** The vendored GitHub styles have fixed colors. A spike counts the rules that the Tokyo layer must override. The spike also shows the owner a real page in a browser before the spec is written.
4. **Setting name.** `palette` is the working name. The owner may pick another word before the spec fixes it.

## Acceptance criteria

- `md-view --palette tokyo file.md` writes a page in Tokyo Night or Tokyo Day, by the mode. A word that is not accepted still gives exit 2.
- `palette=tokyo` in `config.ini` works. The flag beats the file. The saved page choice works for the new setting.
- `--theme auto` with `tokyo` follows the system between Day and Night.
- The `s` key and the popover reach `tokyo`, and the `t` key still changes the mode.
- The page text, the code blocks and the mermaid diagrams all use the palette. A change of palette or mode redraws the diagrams with no reload.
- The left tree panel, its open and close button, the gear and the popover use the palette too. The current file in the tree is easy to see in Day and in Night.
- A one-file page (no tree) and a narrow window (the tree hidden) still work.
- With no `palette` set, the page looks as it does today.
- `securityLevel:'strict'`, the SRI hash, the CSP meta and the hostile-input checks are unchanged and pass.
- The spec, the README and the sample config name the new setting. `make check` passes. The owner sees the page in a real browser and agrees that it looks right.

## Notes

- Owner request: "let's plan a story to add UI themes including for mermaid charts, let's start with tokyo night".
- Owner rulings while the brief was written:
  - The colors come from the official Tokyo Night source.
  - Tokyo Day and Tokyo Night are both in this story.
  - More palettes will come later, so a palette is a setting with a table row, not a new word in the list of modes.
  - The tree panel is in scope. The owner said "don't forget we have left tree". The popover follows the palette too.
- The owner saw a mock page with Tokyo Day and Tokyo Night and said "looks good". The mock had no tree panel.
- The brief sets one default. The owner may change it: `auto` follows the system and picks the day or the night version of the chosen palette.
- started: 2026-11-13T19:39:20Z
- flow tier=full docs=spec,plan design=no orchestrator=yes final=final-reviewer gate=stop scan=yes verifier=plan-verifier-critical
- G2-design waived by owner, 2026-11-13: "go, autonoumous mode"
- Check: `make check`. A `skip all` pass proves only the tests that need no browser.
- Owner-checked paths: `lib/` except `lib/md-view`, `LICENSE`, `AGENTS.md`, `docs/architecture/`. The main session changes `docs/architecture/` at close-out.
- Budget: $15. Hard stop: $20. Size M.
- Hooks: preflight none, verify none, status none, cleanup none. AGENTS.md names no delivery hooks.
- Branch: feat/themes-tokyo-night, in the worktree .worktrees/themes-tokyo-night. The owner asked for a worktree. Base: ee5a918c481ca27b49e9a924f44abb174ec47810.
- Project rule wins over the skill: AGENTS.md says no push, no merge, no tag unless the owner asks. Close-out prepares the branch and the PR text. The owner pushes.
- The owner asked for a worktree rule in AGENTS.md ("add the policy rule to the agents md we do use worktrees"). Commit 4c719e1 adds it, with a `.gitignore` for `.worktrees/` and `.build/`. AGENTS.md is an owner-checked path, and this change is the owner's own request.
