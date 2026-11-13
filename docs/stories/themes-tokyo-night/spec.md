# Spec: themes-tokyo-night

A **palette** is a named set of colors with a light version and a dark version. The words are `github` and `tokyo`. `github` is the look of today. `tokyo` is Tokyo Night (dark) and Tokyo Day (light). The mode (`light`, `dark`, `auto`) picks the version.

## Script: `lib/md-view`

| Call | Result |
|---|---|
| `md-view --palette tokyo --no-open --out P f.md` | Exit 0. The page `P` has `data-start-palette="tokyo"` and `data-forced="1"` in the `html` tag. |
| `md-view --palette github ...` | Exit 0. The page has `data-start-palette="github"`. |
| `md-view --no-open --out P f.md`, no flag and no key | The page has `data-start-palette="github"`. |
| The `html` tag, any run | `<html lang="en" data-start-width="W" data-start-theme="T" data-start-palette="PAL"`. When a flag is set, ` data-forced="1"` follows `data-start-palette`. The tree attributes follow as today. |
| `palette=tokyo` in `[View]` of `config.ini` | The page starts with `tokyo`. The last valid value wins. A value that is not `github` or `tokyo` is ignored. |
| `--palette github` with `palette=tokyo` in the file | The flag wins. The page has `github`. |
| The key line `md-view-key` | `w=W;t=T;p=PAL;f=F;tr=...;r=...;d=...;n=...`. A cache page that was built for another palette is not reused. |
| `md-view --init-config` | The sample has a comment line for `palette` that names `github` and `tokyo`, and the line `palette=github`. |
| The usage text | Lists `[--palette github|tokyo]`. |
| `--print-association` | Unchanged. |

## Validation

| Call | Result |
|---|---|
| `--palette` with no value | Usage on stderr, exit 2. No page. |
| `--palette x`, where `x` is not `github` or `tokyo` | Usage on stderr, exit 2. No page. Examples of `x`: `Tokyo`, an empty word, a word with a space, a quote, `<`, `;` or a backtick. |
| `palette=` with a hostile value in `config.ini` | The value is ignored. The page has `github`. The script runs nothing from the value. |

## Page: palette, controls and saved choice

| Part | Rule |
|---|---|
| Attribute | `html` has `data-palette="tokyo"` when the palette is `tokyo`. For `github` the attribute is absent. |
| Colors | For `tokyo`, `html` has one CSS variable `--p-<key>` for each key of the used mode. The used mode is `dark` or `light`. `auto` follows `prefers-color-scheme` and changes with it. For `github` no `--p-` variable is set. |
| Github | With `github`, the page, the diagrams and the controls look and work as they do before this story. |
| Popover | A row `Style` with one button for each word, between the Width row and the Theme row. The button text is the word. The pressed button has `aria-pressed="true"`. The paste lines always show `palette=<word>`. |
| Keys line | With a tree: `Keys: t theme, s style, w width, b tree, ? help`. On a one-file page: `Keys: t theme, s style, w width, ? help`. |
| Key `s` | Changes the palette in the order `github`, `tokyo`. The same rules as `t`: no Ctrl, Alt or Meta, and no form field with the focus. |
| Saved choice | The key `md-view-palette` in `localStorage`. The same order of use as width and theme: the saved word (unless `data-forced`), then the start word. A saved word that is not accepted is ignored. |
| Reset | Removes `md-view-palette` and applies the start word with no reload. |
| Change | A change of the palette or the mode applies at once, with no reload, and draws the diagrams again. |
| Narrow window | Under 700 px the tree panel, the tree button and the gear stay hidden, as today. The layer sets colors only and never sets `display`. |
| One table | The layer, the code colors and the diagrams take their colors from the one table `PALETTES`. A new palette is one new row of the table and one new word in `palette_ok`. |

## Palette values

Source: folke/tokyonight.nvim, commit `cdc07ac78467a233fd62c493de29a17e0cf2b2b6`, files `extras/lua/tokyonight_night.lua` (Night) and `extras/lua/tokyonight_day.lua` (Day). The repository license is Apache License 2.0. The page uses the color values only, and no code of the project. The values were read on 2026-11-13.

`border` is the source key `fg_gutter`. The source key `border` is nearly the page color in Night, so it is not used.

| Key | Source key | Night (dark) | Day (light) |
|---|---|---|---|
| `bg` | `bg` | `#1a1b26` | `#e1e2e7` |
| `bg-dark` | `bg_dark` | `#16161e` | `#d0d5e3` |
| `bg-hl` | `bg_highlight` | `#292e42` | `#c4c8da` |
| `bg-visual` | `bg_visual` | `#283457` | `#b7c1e3` |
| `fg` | `fg` | `#c0caf5` | `#3760bf` |
| `fg-dark` | `fg_dark` | `#a9b1d6` | `#6172b0` |
| `border` | `fg_gutter` | `#3b4261` | `#a8aecb` |
| `comment` | `comment` | `#565f89` | `#848cb5` |
| `blue` | `blue` | `#7aa2f7` | `#2e7de9` |
| `blue1` | `blue1` | `#2ac3de` | `#188092` |
| `blue5` | `blue5` | `#89ddff` | `#006a83` |
| `cyan` | `cyan` | `#7dcfff` | `#007197` |
| `green` | `green` | `#9ece6a` | `#587539` |
| `green1` | `green1` | `#73daca` | `#387068` |
| `magenta` | `magenta` | `#bb9af7` | `#9854f1` |
| `orange` | `orange` | `#ff9e64` | `#b15c00` |
| `purple` | `purple` | `#9d7cd8` | `#7847bd` |
| `red` | `red` | `#f7768e` | `#f52a65` |
| `yellow` | `yellow` | `#e0af68` | `#8c6c3e` |

## Themed parts

Every rule of the layer starts with `html[data-palette]`, uses `var(--p-<key>)` for each color, and has no `!important` and no hex color.

| Part | Selector (after the prefix) | Properties and keys |
|---|---|---|
| Page | `body`, `.markdown-body` | background `bg`; text `fg` |
| Link | `.markdown-body a` | text `cyan` |
| Heading | `.markdown-body h1, h2, h3, h4, h5, h6` | text `blue` |
| Heading rule | `.markdown-body h1, h2` | border-bottom color `border` |
| Rule | `.markdown-body hr` | background `border` |
| Quote | `.markdown-body blockquote` | text `fg-dark`; left border color `border` |
| Table | `.markdown-body table th, td` | border color `border` |
| Table row | `.markdown-body table tr` | background `bg`; top border color `border` |
| Table row, even | `.markdown-body table tr:nth-child(2n)` | background `bg-dark` |
| Inline code | `.markdown-body code` | background `bg-hl`; text `orange` |
| Code block | `.markdown-body pre` | background `bg-dark`; border color `border` |
| Code block text | `.markdown-body pre code` | background none; text `fg` |
| Key | `.markdown-body kbd` | background `bg-hl`; border color `border`; text `fg` |
| Mark | `.markdown-body mark` | background `bg-visual`; text `fg` |
| Selection | `::selection` (a new rule, not an override) | background `bg-visual` |
| Tree panel | `#md-tree-panel` | background `bg-dark`; text `fg-dark`; border color `border` |
| Tree root | `#md-tree-panel .md-root` | text `fg` |
| Tree link hover | `#md-tree-panel a:hover, a:focus` | text `blue` |
| Tree current file | `#md-tree-panel a[aria-current="page"]` | background `bg-visual`; text `fg` |
| Tree button, gear | `#md-tree-toggle`, `#md-gear` | background `bg-dark`; text `fg-dark`; border color `border` |
| Popover | `#md-pop` | background `bg-dark`; text `fg`; border color `border` |
| Popover button | `#md-pop button` | background `bg-hl`; text `fg`; border color `border` |
| Popover pressed button | `#md-pop button[aria-pressed="true"]` | border color `blue` |
| Popover notice | `#md-pop .md-notice` | text `red` |
| Mermaid error | `.mermaid-error` | text `red` |
| Paste block | `#md-pop pre.md-paste` | text `fg-dark`; border color `border` |

The tree rules exist only in tree mode, as the tree rules do today.

## Code tokens

The token classes of highlight.js, with the key of the text color. The block text is `fg`, and the block background is the code block background above.

| Classes | Key | Other |
|---|---|---|
| `.hljs` | `fg` | background none |
| `.hljs-comment`, `.hljs-quote` | `comment` | italic |
| `.hljs-keyword`, `.hljs-selector-tag` | `purple` | |
| `.hljs-built_in`, `.hljs-type`, `.hljs-title.class_` | `blue1` | |
| `.hljs-title`, `.hljs-title.function_`, `.hljs-section` | `blue` | |
| `.hljs-string`, `.hljs-regexp`, `.hljs-addition` | `green` | |
| `.hljs-number`, `.hljs-literal`, `.hljs-symbol`, `.hljs-bullet` | `orange` | |
| `.hljs-variable`, `.hljs-template-variable`, `.hljs-params`, `.hljs-subst` | `fg` | |
| `.hljs-attr`, `.hljs-attribute`, `.hljs-property` | `green1` | |
| `.hljs-name`, `.hljs-tag`, `.hljs-deletion` | `red` | |
| `.hljs-operator`, `.hljs-punctuation` | `blue5` | |
| `.hljs-meta`, `.hljs-selector-class`, `.hljs-selector-id`, `.hljs-selector-attr`, `.hljs-selector-pseudo` | `cyan` | |
| `.hljs-doctag`, `.hljs-template-tag` | `purple` | |
| `.hljs-code`, `.hljs-formula` | `fg` | |
| `.hljs-emphasis` | | italic |
| `.hljs-strong` | | bold |

## Mermaid

| Rule | Value |
|---|---|
| `securityLevel` | `'strict'`, always. The mermaid URL and the SRI hash do not change. |
| `github` | `theme` is `'dark'` or `'default'`, as before. No `themeVariables`. |
| `tokyo` | `theme` is `'base'`. `themeVariables` is `mermaidVars(colors)`, from the colors of the used mode. |
| Redraw | The diagrams draw again when the pair (palette, used mode) changes. |
| Failure | A diagram that does not draw shows its source and the error text, as before. |

`mermaidVars(colors)` returns these variables. Each value is the color of the key.

| Variable | Key |
|---|---|
| `darkMode` | `true` for the dark mode, else `false` |
| `background`, `edgeLabelBackground` | `bg` |
| `primaryColor`, `actorBkg` | `bg-hl` |
| `primaryTextColor`, `secondaryTextColor`, `tertiaryTextColor`, `textColor`, `titleColor`, `actorTextColor`, `signalTextColor`, `labelTextColor`, `noteTextColor` | `fg` |
| `primaryBorderColor`, `actorBorder` | `blue` |
| `lineColor`, `actorLineColor`, `signalColor` | `fg-dark` |
| `secondaryColor`, `tertiaryColor`, `clusterBkg`, `labelBoxBkgColor` | `bg-dark` |
| `secondaryBorderColor`, `tertiaryBorderColor`, `clusterBorder`, `labelBoxBorderColor`, `noteBorderColor` | `border` |
| `noteBkgColor` | `bg-visual` |
| `pie1`, `pie2`, `pie3`, `pie4`, `pie5`, `pie6` | `blue`, `green`, `magenta`, `orange`, `cyan`, `red` |

## Done

`make check` exits 0 with no `skip all` line in the Chrome tests. These tests prove it.

- One focused case for the setting. The flag and `palette=` reach the page. A bad word gives exit 2. A hostile config value is ignored.
- One case for the cache key.
- The layer test: each row of "Themed parts" and "Code tokens" has a layer rule.
- Three page rows: the start word, the key `s` with the saved word, and a bad saved word.
- The `securityLevel` row on a `tokyo` page, the two diagram rows and the redraw row. They skip with no network.
- The updated exact-tag, keys-line, usage and sample-config checks.

The real run checks the rows of the other tables. The owner reads the screenshots of the sample page and of six diagram types. Reset and the narrow window keep the code of today, so they have no new test. `securityLevel`, the SRI hash, the CSP meta and the hostile-input rows are unchanged and pass.

## Out of scope

A second new palette. Tokyo Storm. A user file with colors. A palette picker for many palettes. A change of the CSP, the mermaid script or any vendored file. Alert boxes, images and footnotes of the Markdown style. A test of the contrast of colors.
