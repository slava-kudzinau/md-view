---
description: The owner's one page for line-anchor-nav: what the build adds, the contracts, the model's decisions, and how to see it.
---

# Gate: line-anchor-nav

_For the owner, who reads this instead of the code. One page per section. The model writes "Before build" before any task starts, and "At merge" at close-out; both go at the top of the PR._

## Before build

### What it builds

A link with a line number opens the file at that line. In your interview plan, `["CPU at peak..."](cv.md#L85)` now opens cv.md at the exact list item from line 85, and flashes it. Ranges `#L85-90` and `#L85-L90` jump to the start of the range and flash every item inside it.

### Parts it touches

```mermaid
flowchart LR
  SRC[Markdown source] --> LEX[marked lexer]
  LEX -->|tokens| PARSE[marked parser]
  PARSE -->|HTML| STAMP[stampLines: stamps each block, item and row]
  STAMP --> DOM[reading pane]
  CLICK[link click] -->|hash #/cv.md#L85| ROUTE[route]
  ROUTE --> SCROLL[scrollToFrag: L grammar]
  SCROLL -->|scroll + flash| DOM
```

### Contracts, data and runtime

- The page fragment `#FRAG` gains two accepted shapes: `L<n>` (a line) and `L<n>-<m>` / `L<n>-L<m>` (a range). Heading slugs work as today. Old links keep working.
- Rendered elements gain two attributes: `data-line="<n>"` and `id="L<n>"` on every top-level block, every list item (any nesting), and every table row.
- The page gains one CSS rule, `.markdown-body .md-line-target`, a soft yellow flash (light and dark theme). The page script sets and clears the class; no timed animation.
- No new tools, no vendored-file change, no config key. `marked.lexer` + `marked.parser` replace `marked.parse` in the render step; the output HTML is the same (measured).

### Decisions the model made

| Decision | Alternative rejected | Why |
|---|---|---|
| Land on the last stamped element at or below the line | Require an element that starts exactly at the line | GitHub's behavior; a quote line inside a paragraph must land on that paragraph. |
| Grammar is case-sensitive: `L` only | Accept `l85` too | GitHub is case-sensitive; one spelling keeps the spec row short. |
| Stamp both `id="L85"` and `data-line="85"` | Stamp only `data-line` | The id lets a one-file page's native fragment jump work beside the script; `data-line` drives the landing search. |
| The flash stays until the next landing | A timed fade-out | No timer to tune; the DOM dump proves the class for the test. |
| Fixed flash color `light-dark(#fff8c5, rgba(187,128,9,.35))`, scoped `.markdown-body .md-line-target` | A palette-driven accent; a bare `.md-line-target` selector | The flash is a transient mark, not theme content; GitHub uses one yellow. The `!important` on its color makes it win over the table stripes, the Tokyo palette rules and the code and rule rules. The scoped selector alone does not: those rules are more specific. |
| A range marks every stamped element inside it | Mark only the landing element | The range is a quote of several items; all of them are the quote. |
| Stamp table rows at `<tr>`, header row at the table's start | Stamp each `<td>` | A row is the unit a quote points at; cells double the stamp count for no gain. |
| Stamps run on every render, no cache | Cache stamps per file | `show()` rebuilds the DOM on every route change; cached nodes would be detached. Lex is cheap at the 8 MiB cap; measure in T1, cache only if slow. |

### Terms on this page

- stamp: write a source line number onto an element, as `data-line` and `id`.
- quote: a link that cites a line of another file, like the `cv.md#L85` links in plan.md. Landing (land on): the element a line anchor scrolls to.
- reading pane: the content area (`#content`) that shows the current file. Route (hash route): the page's URL hash picks the file and anchor; see the Route row in the spec. `#FRAG`: the anchor part of that hash.
- `show()`: the function in `lib/page.js` that renders one file into the reading pane. `md-view`: this tool; run it with `sh bin/md-view <file>`.
- marked: the vendored Markdown engine (`lib/marked.min.js`). `.markdown-body`: the class the vendored GitHub stylesheet (`lib/github-markdown-*.css`) puts on the rendered Markdown. Vendored files: the nine third-party `lib/` files with their licenses.
- palette-driven accent: the page setting that tints diagrams from a palette (`palette=` in the config). 8 MiB cap: the spec's limit on the page text.
- T1, T2, T3: task labels in `plan.md`. `dom_line_*` rows: the new test cases in `tests/browser-links-dom.sh`, named like the existing `dom_*` cases.
- cv.md, plan.md: example file names. The quotes on this page point at them; they are not in this repo.

### How you'll see it working

Run `md-view plan.md` in a folder that also holds `cv.md`. Then click a `cv.md#L85` quote. cv.md opens scrolled to the list item from line 85, with a yellow flash.

Test rows: `sh tests/browser-links-dom.sh` (at least 11 new `dom_line_*` rows).

### A fresh reader's paraphrase

md-view gains line-number links: a Markdown link whose target ends in a fragment naming a source line (`["CPU at peak…"](cv.md#L85)`) opens that file scrolled to the rendered element made from that line, and highlights it. A range fragment (`#L85-90` or `#L85-L90`) lands at the range's start element and highlights every stamped element inside the range. This is additive: existing heading-slug anchors and old links keep working, because the line shapes are two new accepted forms of the page's `#FRAG`.

Rendering is a chain the page reruns on every route change: Markdown source -> marked lexer -> tokens -> marked parser -> HTML -> a new `stampLines` step. It writes the source line number (`data-line` and `id="L<n>"`) onto each top-level block, list item, and table row before the nodes reach the reading pane. Clicking a link changes the hash route (`#/cv.md#L85`). The route drives `scrollToFrag`, which now understands the `L` grammar, picks the last stamped element at or below the line, scrolls to it, and sets a flash class. One new CSS rule (`.markdown-body .md-line-target`, fixed yellow) sets the look; the script sets and clears the class, and it stays until the next landing. The build swaps `marked.parse` for `marked.lexer` plus `marked.parser`, with the output HTML measured the same; no new tools, no vendored-file change, no config key.

## At merge

### What was built

{{against "What it builds": same, more, or less, and why}}

### Decisions changed during the build

{{rows changed or added in the table above, with the reason; or "none"}}

### What the reviews caught

{{the findings that changed code, one line each; or "nothing that changed code"}}

### Run it

{{the command or demo, and what you should see}}
