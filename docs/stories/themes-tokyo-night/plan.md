# Plan: themes-tokyo-night

Spec: `docs/stories/themes-tokyo-night/spec.md` (governs exact values). It is the story spec. The durable spec, `docs/architecture/md-view.spec.md`, changes at close-out.

## Global Constraints

- Language: POSIX `sh` for `lib/md-view` and the tests, and plain browser JavaScript (ES5 style, as the page script has now) inside `lib/md-view`. Add no tool, no package and no file to `lib/`.
- The files that this story may change: `lib/md-view`, `tests/browser-page.sh`, `tests/browser-links-dom.sh`, `tests/hostile-dom.sh`, the new fixture `tests/browser-page/diagrams.md`, `README.md` and the story spec `docs/stories/themes-tokyo-night/spec.md`. Nothing else. `docs/architecture/` changes at close-out, in the main session. The folder `.build/` (the `status.md` file, the test outputs and the shots) is ignored by git. Never commit it.
- Do not weaken the `Content-Security-Policy` meta. Do not weaken the mermaid `securityLevel:'strict'`, the pinned mermaid URL or its SRI hash. Do not weaken the escape of raw HTML or the block of remote images. Do not edit a vendored file.
- Treat the flag value, the `config.ini` value and the saved page value as untrusted. Only the words `github` and `tokyo` reach the page. Never run a value.
- Words: the setting is `palette`. The accepted words are `github` and `tokyo`. The default is `github`. The flag is `--palette`. The key in `config.ini` is `palette=`. The page attribute is `data-start-palette`, and the saved key is `md-view-palette`. The key `s` changes the palette. The popover row is `Style`.
- Names in the page script: `PALETTE_WORDS`, `PALETTES`, `KEY_PALETTE`, `paletteSetting()`, `setPalette(p)`, `applyPalette()`, `mermaidVars(colors)`. A color of a palette is a CSS variable with the name `--p-` and the key, for example `--p-bg-dark`. The keys are in `spec.md`.
- With palette `github`, the page must look and work as it does now. The attribute `data-palette` is absent, and no `--p-` variable is set.
- The layer sets colors only. It never sets `display`, `position`, `width` or `padding`, so the narrow window and the one-file page work as they do now.
- Commit message: a short imperative summary line, a blank line, then the attribution trailer line. The main session gives you the exact line in your prompt. Copy it exactly. One commit per task.
- Check: `make check`. Owner-checked paths: `lib/` except `lib/md-view`, `LICENSE`, `AGENTS.md`, `docs/architecture/`.
- Tests that need Chrome or the network print `skip`. Do not remove a `skip` rule to pass a run. Run each new test against the wrong behavior once, to see it fail.
- Tests drive the page the way the existing DOM tests do. The helper `measured` builds a page with an injected `<script>`. The script sets `localStorage` or sends a `KeyboardEvent` with `document.dispatchEvent`. A forced page (`--theme dark` or `--theme light`) fixes the mode.
- The done check of a task reads the test output from `.build/`. A `skip all` line, or a missing `ok` line, fails the check. So a missing task cannot pass.

## T1: The palette setting in the script

**Depends on:** none
**Done check:** `sh tests/browser-page.sh > .build/t1.out && grep -q '^ok palette_setting$' .build/t1.out && grep -q '^ok palette_cache$' .build/t1.out && ! grep -q '^FAIL' .build/t1.out` exits 0
**Role:** implementer — review task-reviewer-critical

Change `lib/md-view` only in the shell part.

- Add the function `palette_ok <word>`. It succeeds for `github` and `tokyo`. Use it in the three places that take a word: the `--palette` flag, `read_ini` (key `palette`) and the check before the word reaches the page.
- Flag: `--palette github|tokyo`. A missing value or another word calls `usage` (exit 2). The usage text lists `[--palette github|tokyo]`. A repeated flag: the last one wins, as for `--theme`.
- `read_ini`: a new `cfg_palette`. The last valid value wins. A value that is not accepted is ignored. The word is exact and case-sensitive. The existing `trim` removes the spaces around it, as for `theme`.
- Order of use: flag, then file, then `github`. A `--palette` flag sets `forced=1`, as `--width` and `--theme` do.
- The `html` tag gets `data-start-palette="<word>"` after `data-start-theme`, always. Example: `<html lang="en" data-start-width="70" data-start-theme="auto" data-start-palette="github">`.
- The key line `md-view-key` gets `p=<word>` after `t=<theme>`, so a cache page of another palette is built again.
- The sample config (`--init-config`) gets two new lines.
  - After the `theme` comment and before the `browser` comment: `# palette: github or tokyo. tokyo has a day and a night version, and the theme picks one.`
  - After the line `theme=auto`: `palette=github`.
- `--print-association` and the far2l text do not change.

Tests in `tests/browser-page.sh`. Add the two names to the `for c in ...` list.

- `case_palette_setting` proves these facts.
  - `--palette tokyo` and `--palette github` reach `data-start-palette`, and the flag adds `data-forced="1"`.
  - `palette=tokyo` in `config.ini` reaches the page, and the flag beats the file.
  - A bad word, a missing value and a word with a shell or HTML hazard give exit 2 and no page.
  - A hostile `palette=` value in the file is ignored.
- `case_palette_cache`: a cache page of `github` is not reused for `tokyo`.

Update the cases that check the exact `html` tag (`expect_tag` takes the palette), the exact sample-config lines and the usage text.

## T2: The palette in the page script

**Depends on:** T1
**Done check:** `sh tests/browser-links-dom.sh > .build/t2.out && ! grep -q '^skip all' .build/t2.out && grep -q '^ok palette: start' .build/t2.out && grep -q '^ok palette: key s' .build/t2.out && grep -q '^ok palette: bad saved word' .build/t2.out && ! grep -q '^FAIL' .build/t2.out` exits 0
**Role:** implementer — review task-reviewer-critical

Change the page script inside `lib/md-view`. No color rule yet; the colors only reach the page as CSS variables.

- `PALETTES` has one entry for `tokyo`, with `light` and `dark` color maps. Copy the keys and the hex values from the tables of `spec.md`, exactly. Each map has all 19 keys. `PALETTE_WORDS` is `['github'].concat(Object.keys(PALETTES))`, so the page script has one list. Use the existing helpers: `accepted(v, words, dflt)` and `nextWord(list, v)`.
- `KEY_PALETTE = 'md-view-palette'`. `load()` reads the saved word with `accepted(...)` and the start word `data-start-palette`, with the same `forced` rule as width and theme.
- The word in use is the attribute `data-palette` of `html`. For `github` the attribute is absent, and `paletteSetting()` returns `github` when the attribute is absent.
- `applyPalette()` runs inside `applyTheme()`. For `tokyo` it sets `data-palette="tokyo"` and one CSS variable on `html` for each key of the used mode (`usedTheme()` picks `light` or `dark`). For `github` it removes the attribute, and it removes `--p-<key>` for each key of the `tokyo` color map. A change of the system theme under `auto` re-runs it.
- `setPalette(p)` ignores a word that is not in `PALETTE_WORDS`. Otherwise it saves with `save(KEY_PALETTE, p)`, sets the word and calls `applyTheme()`. `resetChoice()` also removes the saved palette and applies the start word.
- Popover: a row `Style` with one button for each word, between the Width and Theme rows, with `aria-pressed`. The button text is the word in lower case, as for the theme buttons. The paste lines always show `palette=<word>`, also for `github`. The keys line becomes `Keys: t theme, s style, w width, b tree, ? help`, and `Keys: t theme, s style, w width, ? help` on a one-file page. The key `s` calls `setPalette(nextWord(PALETTE_WORDS, paletteSetting()))` under the same rules as `t` (no Ctrl, Alt or Meta, no form field).
- `refresh()` marks the pressed palette button.

Tests in `tests/browser-links-dom.sh`: update the two keys-line rows. Add these rows. Use forced pages for the mode.

- `palette: start`: the start word `tokyo` gives `data-palette="tokyo"` and 19 `--p-` variables. The value of `--p-bg` is the Night value with `--theme dark`. It is the Day value with `--theme light`. The start word `github` gives no `data-palette` and no `--p-` variable.
- `palette: key s`: the key `s` goes from `github` to `tokyo` and back. A saved word is used on a page that no flag forced.
- `palette: bad saved word`: a saved word that is not accepted is ignored, and the page has no `data-palette`.

## T3: The color layer

**Depends on:** T2
**Done check:** `sh tests/browser-page.sh > .build/t3.out && grep -q '^ok palette_layer$' .build/t3.out && ! grep -q '^FAIL' .build/t3.out` exits 0
**Role:** implementer — review final

Add the layer to the `<style id="page">` text in `lib/md-view`. Every rule starts with `html[data-palette]`, so it beats the vendored styles by specificity. For each part, find the vendored rule that sets the same property, and write its selector after the prefix. Then the layer rule is always the more specific one. The rule `::selection` is new, so write it as `html[data-palette] ::selection`. Use no `!important`. Every color is `var(--p-...)`. The words `transparent`, `none`, `inherit` and `currentColor` are allowed. Set colors only (see Global Constraints).

- Page: the rows of the table "Themed parts" of `spec.md` for the page, the quote, the tables, the code and the key.
- Code: the table "Code tokens" of `spec.md`.
- Tree panel, tree button, gear and popover: the rows of "Themed parts" for them.
- Mermaid error text.

Test: in `tests/browser-page.sh`, add `case_palette_layer` to the list. For each row of "Themed parts" and each row of "Code tokens", the page text holds a rule that starts with `html[data-palette]` and names that selector. No rule of the layer holds `!important`, a hex color or the property `display`. Run the case once against a page with one rule removed, to see it fail.

## T4: Mermaid with the palette

**Depends on:** T2
**Done check:** `sh tests/hostile-dom.sh > .build/t4h.out && sh tests/browser-links-dom.sh > .build/t4d.out && grep -q '^ok palette: tokyo dark draws svg' .build/t4h.out && grep -q '^ok palette: tokyo light draws svg' .build/t4h.out && grep -q '^ok palette: mermaid redraw' .build/t4d.out && ! grep -q '^FAIL' .build/t4h.out .build/t4d.out` exits 0
**Role:** implementer — review task-reviewer-critical

- `mermaidVars(colors)` returns the `themeVariables` object from the color map of the used mode, by the mapping table in `spec.md`. The maps have all 19 keys, so it checks nothing.
- `mermaid.initialize` keeps `startOnLoad:false` and `securityLevel:'strict'`. For `github` the `theme` is `dark` or `default`, as now. For `tokyo` the `theme` is `base`, and `themeVariables` is `mermaidVars(...)`.
- The redraw rule `usedTheme() !== drawnTheme` becomes a rule on the pair (palette, used mode), so a change of palette also draws the diagrams again. `drawnTheme` holds the pair as one string with a colon, for example `tokyo:dark`.
- The failure rule does not change: a diagram that does not draw shows its source.
- Add the fixture `tests/browser-page/diagrams.md`. It has one small diagram of each type, each under 8 lines. Put a heading before each one.
  - Flowchart: `flowchart LR`, 4 nodes, labels on two edges.
  - Sequence: 3 participants, 4 messages.
  - Class: 3 classes, one member each.
  - State: 4 states.
  - Gantt: 2 sections, 3 tasks.
  - Pie: 4 slices.

Tests. The rows that need the network use the same `net_check` helper and `skip` rule as the existing mermaid rows.

- In `tests/hostile-dom.sh`, keep every existing row. Add `palette: tokyo strict` (the initialize call has `securityLevel` `strict` on a `tokyo` page, and the page has one CDN script only). Add `palette: tokyo dark draws svg` and `palette: tokyo light draws svg` (each page has an SVG in its diagram block).
- In `tests/browser-links-dom.sh`, add `palette: mermaid redraw`. A `github` dark page has a diagram. An injected script sends the key `s`. After that the SVG text holds the Night value of `bg-hl` (`#292e42`), and it did not hold it before.

## T5: The README and the real run

**Depends on:** T1, T2, T3, T4
**Done check:** `make check > .build/t5.out && ! grep -q '^FAIL' .build/t5.out && grep -q -- '--palette' README.md && grep -q 'palette=' README.md && [ "$(ls .build/shots/*.png | wc -l)" -eq 6 ]` exits 0
**Role:** implementer — review final

- `README.md`: the option table gets `--palette github|tokyo`. The keys table gets `palette`. The page paragraph names the key `s`. A short paragraph explains the palettes: `tokyo` has a day and a night version and follows the mode. A line says where the colors come from (the source line from `spec.md`).
- Run `check_ste.py` on `README.md` and fix what it lists in the lines that you changed.
- Real run: for each of `tests/browser-page/sample.md` and `tests/browser-page/diagrams.md`, write the page with `--palette tokyo --theme dark`, with `--palette tokyo --theme light` and with `--palette github --theme dark`. Take a headless Chrome screenshot of each with `--screenshot` into `.build/shots/`. Name each file `<fixture>-<palette>-<mode>.png`, for example `diagrams-tokyo-dark.png`. Use `--virtual-time-budget=10000`, so mermaid can draw. Use a 1200 by 2400 window. Open the sample page in tree mode, so the tree panel is in the shot. The result is 6 files.
- If a diagram type is hard to read in a shot, add the needed `themeVariables` to `mermaidVars` and to the table in the story spec. Log each addition in `.build/status.md`.
- In the final report, list the 6 paths. Add the command that writes a Tokyo Night page, so the owner can open it in a real browser: `lib/md-view --palette tokyo --theme dark tests/browser-page/sample.md`.
