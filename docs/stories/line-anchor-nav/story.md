---
description: Adds line anchors to the page, so a link with a hash like L85 opens the file at the block that came from that source line, with a flash.
status: planned
size: M
risk: contract, security
---

# line-anchor-nav

## Goal

A writer quotes a line of another file, for example in an interview plan: `["CPU at peak..."](cv.md#L85)`. Today the click opens cv.md at the top, because the fragment `L85` matches no heading. The page learns GitHub's line anchors. `#L85`, `#L85-90` and `#L85-L90` scroll to the block, list item or table row of that source line. They flash it.

## Context

Spec rows Route and Links, `docs/architecture/md-view.spec.md:120-121`. Render pipeline `show()` `lib/page.js:420-471`; fragment scroll `scrollToFrag` `lib/page.js:384-391`; route split `route()` `lib/page.js:393-401`. Vendored marked v18.1.3 (`lib/marked.min.js:2`) exposes `lexer`, `parser`, `use` and `walkTokens`. No token carries a line number. The token raws concatenate to the exact embedded source (`lib/md-view:545-585`, `unescapeText` `lib/page.js:124-145`). Research (2026-11-18, two scouts): `marked.parser(marked.lexer(src))` equals `marked.parse(src)` under the page's renderer overrides. The overrides (`lib/page.js:596-604`) change markup, not tokens. Every gfm block token renders one DOM root under those overrides. `space` and `def` render none. So tokens pair with template children in document order.

## Scope

**In.**

- **Stamps** in `show()` (`lib/page.js:436-438`): replace `tpl.innerHTML = marked.parse(files[enc])` with a lex of `files[enc]`, a parse of the same tokens, and a new `stampLines(tokens, tpl.content)` call. It runs before `headingIds` (`lib/page.js:444`). The new functions (`stampLines`, `pairBlocks`, about 80 lines) sit after `unescapeText` (`lib/page.js:108-110`). Each token's start line is `1 + Σ \n` over the preceding `token.raw` values. The pair walk joins block tokens with template children in document order. It skips `space` and `def`, and counts one root for every other type, and for an unknown future type. It sets `data-line="<n>"` plus `id="L<n>"` on the element that starts each block, each list item, and each table row. List items pair through `list.items` with `item.raw`. Table rows use line arithmetic over the table token's `raw`, not tokens. Stamps run on every `show()`, so no cache is needed.
- **Grammar and scroll** in `scrollToFrag` (`lib/page.js:384-391`): keep the heading lookup first. A heading slug wins. After it, test the `decodeText` value against `/^L(\d+)(?:-L?(\d+))?$/`. A hit lands on the last stamped element with `data-line` at or below the start line, clamped to `1`. A range parses both `L85-90` and `L85-L90`, and clamps the end to at least the start. It scrolls to the range start. It marks every stamped element whose line falls inside the range. No change to `route`, `currentRoute`, `target`, `applyLink`, `encPath` or `lib/md-view`. The fragment already travels the hash opaquely and decodes once.
- **Flash**: `scrollToFrag` clears the class `md-line-target` from the elements of the last landing, then sets it on the landed element (range: on every marked element). `lib/page.css` gains one rule set: a soft background on `.md-line-target`, readable in both themes (use the palette variables). CSS `:target` cannot work in tree mode, because the document fragment of `#/cv.md#L85` is `/cv.md#L85`.
- **Spec** `docs/architecture/md-view.spec.md`: the Route row (`:120`) says a `FRAG` is a heading slug, a line `L<n>`, or a range `L<n>-<m>`. It also accepts `L<n>-L<m>`. The page scrolls to the block, list item or row of the first line, and flashes the landed marks. The Links row (`:121`) writes the tree link target as `#/ENC[#FRAG]`. The Content-cases table (after `:186`) gains a row "Link with a line anchor". Its fixture links `cv.md#L85` into a list; the page shows the item of line 85 flashed. The Tests register row of `tests/browser-links-dom.sh` (`:249`) says "anchors and line anchors".
- **README** `README.md:53`: one sentence in the keys paragraph: a link with `#L85` opens the file at that source line.
- **Tests** in `tests/browser-links-dom.sh`: at least five new rows in the register (after `:799-800`). The fixture has a known list and table. `L<n>` on a list item lands on the item's element: its `id` and `data-line` gate the title rewrite, and it carries `md-line-target`. `L<n>` on a table row lands on the row. A range `L<n>-<m>` marks the items inside it. A line past the last line lands on the last stamped element. `#L0` lands on the first block. The existing rows `dom_heading_ids`, `dom_anchor_same_file`, `dom_anchor_other_file` and `dom_one_file_anchor` pass unchanged. Gate on the stamp and the class, not on the native fragment jump.

**Out.** Line numbers in a gutter (future story). Per-paragraph anchor ids like GitHub's (future story). "Copy link" buttons (future story). The limit-note behavior of a `big` or `cut` file, which drops the fragment (existing, spec row unchanged).

## Size

M: two new functions in `lib/page.js`, about 100 lines. One CSS rule set, one grammar branch, one spec row set, one README sentence. At least five test rows. Hard stop L.

## Unknowns

- Lex cost at the 8 MiB page cap is unmeasured. First task: time `marked.lexer` on the biggest fixture in headless Chrome. Fallback if the page feels slow: cache the stamps per `enc` after the first `show()`.
- Chrome native fragment-jump timing under `--virtual-time-budget` is unmeasured. The test gates on the stamp and the class, which the script sets itself, so this cannot flake the rows.
- List nesting deeper than two levels: `item.raw` covers every level, so pairing recurses; the first task proves it with a three-level list fixture.

## Acceptance criteria

- With two files in one root, a link `[t](b.md#L85)` gets `href` = page URL `#/b.md#L85` (unchanged). After the click, the content shows the element stamped `data-line` 85, or the last stamp at or below it. That element carries class `md-line-target`, and the page is scrolled to it.
- In one-file mode, `[t](#L85)` scrolls to the stamped element and flashes it; `[t](x.md#L85)` keeps its relative href and the opened page lands on the stamp.
- `#L85-90` and `#L85-L90` scroll to the first line of the range and mark every stamped element inside it. `#L999` (past the end) lands on the last stamped element. `#L0` lands on the first.
- A heading slug anchor behaves exactly as today, and wins when a heading id and a stamp share the line.
- The new `tests/browser-links-dom.sh` rows pass (at least five; read the `skip` lines) and the four existing anchor rows pass unchanged; `make check` is green.
- Close-out: spec Route, Links, Content-cases and Tests register rows are in step; `README.md:53` is in step; `check_ste.py` is clean on every touched page.

## Notes

- Owner decisions (2026-11-18): approach A, lex-once plus DOM pairing, over `marked.use` renderer overrides. Nested stamps: blocks, list items, table rows. The driver fixture has line 85 on a list item inside a list that starts at line 83. Grammar `L85` plus ranges `L85-90` and `L85-L90`. Landing flash yes, as a JS class. CSS `:target` cannot match the tree-mode hash `#/cv.md#L85`.
- Branch `feat/line-anchor-nav`, base `main`. It runs after `diagram-laser-pointer` (in-review). Both touch `lib/page.js` and the spec Tests table, in regions that do not overlap. It runs in parallel with `mermaid-accent-toolbar`, which edits the viewer regions of the same files.
- Budget M ($15, hard stop $20). Check: `make check`; the new rows need Chrome (skip with `skip` lines otherwise). Owner-checked paths: the nine vendored `lib/` files and their licenses. The stamps add no vendored change.
- flow tier=full docs=spec,plan design=no orchestrator=yes final=final-reviewer gate=stop scan=yes verifier=none. Gate: the owner reads gate.md before the build (risk flags contract, security).
- Risk notes: `contract` — the meaning of a page fragment grows (new accepted values; every old input keeps working). `security` — the fragment is untrusted; the new parse is one anchored regex over the decoded text, consumed by `getElementById`/`scrollIntoView`/`setAttribute` only.
