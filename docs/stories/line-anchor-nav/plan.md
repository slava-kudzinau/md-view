---
description: The build plan for line anchors: stamps and grammar with tests, the flash style, and the doc rows.
---

# Plan: line-anchor-nav

Spec: `spec.md` (governs exact values). No design.md (the plan carries the design).

## Global Constraints

- Page code stays ES5-style, as in the rest of `lib/page.js`: `var`, `function`, no arrow functions, no new tools or packages.
- Files this story may touch: `lib/page.js`, `lib/page.css`, `tests/browser-links-dom.sh`, `docs/architecture/md-view.spec.md`, `README.md`. The nine vendored `lib/` files stay untouched.
- Exact values: the grammar regex is `/^L(\d+)(?:-L?(\d+))?$/` (case-sensitive) applied to the `decodeText` value, after the heading lookup and before the top fallback. Stamp attributes on elements: `data-line="<n>"` set first, then `id="L<n>"`, both 1-based. The flash class is `md-line-target`. A landing clears the class from the previous landing's elements first; the previous landing lives in a module-level array.
- The stamp pairs tokens and elements 1:1 in document order. Skip `space` and `def`; they only advance the line counter. Every other type counts one element root. An unknown future type counts one root.
- Test rows run under headless Chrome; `dom HASH` dumps the page with that hash. Gate on the stamp and the class in the dumped DOM, never on scroll position.
- Commit message: a short imperative summary line, an optional body after a blank line, no trailer. One commit per task.
- Check: `make check`. Owner-checked paths: the nine vendored `lib/` files and their licenses.

## T1: Stamps, grammar, and tests in `lib/page.js`

**Depends on:** none
**Done check:** `sh tests/browser-links-dom.sh` exits 0

**Pinned tests:** `page_hljs_after_marked` and `page_gear_markup` in `tests/browser-page.sh` pin the line `tpl.innerHTML = marked.parse(files[enc]);`. Update each pin to the new render line; each pin still checks one exact line.
**Role:** implementer — review task-reviewer-critical

In `show()` (`lib/page.js:436-438`): replace `tpl.innerHTML = marked.parse(files[enc]);` with:

```js
var mdTokens = marked.lexer(files[enc]);
tpl.innerHTML = marked.parser(mdTokens);
stampLines(mdTokens, tpl.content);
```

The call sits before `headingIds(nodes)` (`lib/page.js:444`), so a heading `id` overwrites a stamp `id` and the heading wins.

New functions `stampLines(tokens, nodes)`, `stamp(el, line)`, and a module-level array `lineMarks`. Insert them after `unescapeText` (`lib/page.js:108-110`). The internal helper shape is the implementer's; keep helpers below `stampLines`.

- Walk `tokens` with a running `line` that starts at 1. For each token, add its `raw` newline count to `line` when you finish it.
- If `type` is `space` or `def`, add the count and continue.
- Otherwise take the next element child of `nodes`, skipping text and comment nodes. Stamp that child, descend into it, then add the token's newline count.
- `stamp(el, line)`: `el.setAttribute('data-line', line); el.setAttribute('id', 'L' + line);` in that order.
- `list` tokens: iterate `list.items` in order. The item's start line is the running list line. Stamp the paired `<li>`; items pair 1:1 with the `ul` or `ol` element children in order.
- Descend into `item.tokens` for nested lists, tables and paragraphs. Use the item's own running line.
- After each item, add the `raw` newline count of that item.
- `table` tokens: stamp the paired `table` element, its `thead > tr`, and each `tbody > tr`. Header row: the table's start line. Body row `i` (0-based): `start + 2 + i`, from the row count of `table.rows`, not from `raw`.
- A `code` token renders one `pre` root. Paragraph, heading, `hr`, `blockquote`, `text` and `html` render one root each. The page's escape override makes `html` one `<p>`.

- In `scrollToFrag(frag)` (`lib/page.js:384-391`) keep the heading lookup. It uses `user-content-` plus the decoded text, then the lowercased text.
- On a miss, take `decodeText` and test `/^L(\d+)(?:-L?(\d+))?$/`.
- On a hit set `start = Math.max(1, Number(m[1]))` and `end = m[2] ? Math.max(start, Number(m[2])) : start`.
- Scan `content.querySelectorAll('[data-line]')` in document order. The landing is the last element whose `data-line` is at or below `start`. Call `scrollIntoView()` on it, with no arguments, as the heading path does today.
- Clear `md-line-target` from the elements in `lineMarks`. Then add the class to every element whose `data-line` falls inside `[start, end]`, and store those elements in `lineMarks`.
- A one-line anchor has `start` equal to `end`, so it marks the landing alone.
- On no hit, call `window.scrollTo(0, 0)` as today.

Tests in `tests/browser-links-dom.sh`: five new `case_*` functions after `case_dom_one_file_anchor` (line 380), using one fixture. The fixture is a one-file page: `build o.md` with no sibling files. `dom '#L8'` loads it with the hash `#L8`; `route()` gives `{enc: null, frag: 'L8'}`, `show()` renders o.md, and the scripted landing sets the class. The asserts read the dumped DOM, not scroll position.

```sh
printf '# T\n\n[go](#L8)\n\npara one\n\n- alpha\n- beta\n  - deep\n\n| a | b |\n| - | - |\n| 1 | 2 |\n| 3 | 4 |\n\nend\n' > o.md
build o.md
```

- Line 1 is `# T`, line 3 the link paragraph, line 5 `para one`.
- Line 7 is the list, with alpha on 7, beta on 8 and deep on 9.
- Line 11 is the table, with the header on 11 and body rows on 13 and 14. Line 16 is `end`.

- `dom_line_list_item`: `dom '#L8'` → grep the exact `<li data-line="8" id="L8" class="md-line-target">beta</li>` and the kept `<a href="#L8">go</a>`.
- `dom_line_table_row`: `dom '#L13'` → grep `<tr data-line="13" id="L13" class="md-line-target">`.
- Then gate the paint. Use `with_script "$page"` with a script that runs after the page script. The script sets `document.title='bg='+getComputedStyle(document.getElementById('L13')).backgroundColor;`.
- Set `page=$d/injected.html`, dump with `dom '#L13'`, and grep the dumped `<title>` for `bg=rgb(255, 248, 197)`.
- The class alone can lose to `.markdown-body table tr` (`lib/page.css:48`). So this row proves the paint.
- `dom_line_range`: `dom '#L7-L9'` → grep `<li data-line="9" id="L9" class="md-line-target">deep</li>` (the end of the range is marked) and `<li data-line="7" id="L7" class="md-line-target">alpha` (the landing).
- `dom_line_past_end`: `dom '#L99'` → grep `<p data-line="16" id="L16" class="md-line-target">end</p>`.
- `dom_line_zero`: `dom '#L0'` → grep `data-line="1"` and `id="user-content-t"` and `md-line-target` on the `h1` (three checks; the heading id overwrote the stamp id).

Register the five names in the `dom` list at the register (`tests/browser-links-dom.sh:799-801`), after `dom_raw_html_text`, matching the continuation-line style.

## T2: The flash style

**Depends on:** T1
**Done check:** `sh tests/browser-page.sh && sh tests/browser-links-dom.sh` exits 0

**Pinned tests:** `case_tree_off_same_page` in `tests/browser-page.sh` compares the page style with the base. Add the flash rule line to the `viewer_map` deletions.
**Role:** implementer — review final

Append to `lib/page.css`:

```css
.markdown-body .md-line-target { background-color: light-dark(#fff8c5, rgba(187, 128, 9, .35)); }
```

The append sits after the last rule, outside the `viewer_map` sed range of `tests/browser-page.sh:2393-2398`, so the line-count check needs no edit.
The `.markdown-body` prefix is required. `.markdown-body table tr` (`lib/page.css:48`) sets `background-color` on rows. Two class terms beat one class and two types, so a bare `.md-line-target` would lose on a stamped `<tr>`. The `dom_line_table_row` row gates on the computed `backgroundColor` for exactly this reason.

## T3: Docs

**Depends on:** none
**Done check:** `sh tests/browser-page.sh` exits 0
**Role:** implementer — review final

- `docs/architecture/md-view.spec.md:120` (Route): `#/ENC#FRAG` also scrolls to the anchor. A `FRAG` is a heading slug, a line `L<n>`, a range `L<n>-<m>`, or a range `L<n>-L<m>`.
- A line anchor lands on the block, list item, or row of that source line. It uses the last stamp at or below it, and flashes the landed marks.
- `docs/architecture/md-view.spec.md:121` (Links): the tree link form becomes `#/ENC[#FRAG]`.
- Content-cases table, after the "Link to a `big` or `cut` file" row (`:186`): one row "Link with a line anchor" — fixture `[go](o.md#L8)` with the T1 fixture; result: line 8 shows flashed.
- Tests register `docs/architecture/md-view.spec.md:249`: `tests/browser-links-dom.sh` "… heading ids, anchors and line anchors."
- `README.md:53`: add one sentence: a link with `#L85` opens the file at that source line.
