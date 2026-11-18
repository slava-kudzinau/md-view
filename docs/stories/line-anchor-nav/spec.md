---
description: The testable contract of line anchors: stamps on rendered blocks, the L fragment grammar, the landing and the flash.
---

# Spec: line-anchor-nav

## `lib/page.js` — stamps (render time)

| Call | Result |
|---|---|
| `show(enc, frag)` renders a file | Each top-level block element, each list item `<li>` at every nesting depth, and each table `<tr>` gets `data-line="<n>"` and `id="L<n>"`. `n` is the 1-based source line of that item's first line. |
| Start line of a top-level token | `Σ \n` over the `raw` of all preceding tokens, from 0, because the embedded text starts with a newline. The lexer raws concatenate to the source, so the sum is exact. `space` and `def` tokens render no element; they advance the line counter and take no DOM child. |
| Pairing of tokens and elements | One element root per token for every other gfm type, in document order. An unknown future token type counts as one root. An `html` token renders as escaped text and takes no root. The `text` token of a tight list item takes no root; only its inline elements do. A `checkbox` takes its `input` and no stamp. A list and a blockquote advance the line by their own `raw`. |
| `marked.parser(marked.lexer(src))` under the page's renderer overrides | The same string as `marked.parse(src)`. Measured in node on a fixture with a list and a table, 2026-11-18. |
| List items | Each `list_item`'s start line comes from the newlines of the preceding `item.raw` values inside the list's `raw`. Nesting recurses through `item.tokens`. |
| Table rows | The table starts on its token line. The header row takes that line. Body row `i` (0-based) takes `start + 2 + i` (header line, separator line, then rows). |
| A heading on the stamped line | `headingIds` runs after the stamp and overwrites the heading's `id`. The heading id wins; `data-line` stays. |

## `lib/page.js` — `scrollToFrag(frag)` (scroll time)

| Call | Result |
|---|---|
| `scrollToFrag('sec')` | Unchanged: scrolls to `user-content-sec`, then to `user-content-sec` lowercased, then to the top. |
| `scrollToFrag('L85')` on a decoded fragment matching `/^L(\d+)(?:-L?(\d+))?$/` after the heading lookup | Scrolls to the last stamped element with `data-line` at or below `85` (clamped to a minimum of 1). That element gets class `md-line-target`. |
| `scrollToFrag('L85-90')` and `scrollToFrag('L85-L90')` | Same landing for `85`. Every stamped element with `data-line` inside `[85, 90]` gets class `md-line-target`. An end below the start clamps to the start. |
| `scrollToFrag('L999')` past the last line | The last stamped element lands and flashes. |
| `scrollToFrag('L0')` | The first stamped element lands and flashes. |
| `scrollToFrag('l85')` | Not a line anchor (the grammar is case-sensitive): the heading lookup rules, so the top of the page. |
| Any new landing | `md-line-target` is removed from the elements of the previous landing before the new set is applied. |
| A fragment with `%XX`, for example `%4C3835` | `decodeText` decodes once, so it lands like `L85`. |

## Done

`sh tests/browser-links-dom.sh` exits 0 with five new rows (`dom_line_list_item`, `dom_line_table_row`, `dom_line_range`, `dom_line_past_end`, `dom_line_zero`) and the four existing anchor rows unchanged. `make check` exits 0. Every row above is covered by a test there, by `tests/browser-page.sh`, or by a named manual check in `closeout.md`.

## Out of scope

Line numbers in a gutter. Per-paragraph anchor ids. Copy-link buttons. Changes to `big`/`cut` limit notes, which keep dropping the fragment.
