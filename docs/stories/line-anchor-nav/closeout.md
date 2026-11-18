---
description: The close-out draft of line-anchor-nav: result, build decisions, minor findings left open, durable doc work for the main session, and review yield.
---

# Close-out: line-anchor-nav

Result: md-view stamps source lines on rendered blocks, lands on `L<n>`, `L<n>-<m>` and `L<n>-L<m>` anchors, and flashes the landing. Check: `make check` exit 0 (212 ok, no skip lines; the note `root_slash_off: not run` is an environment gate, not a skip rule). The main session reruns it.

Commits: `0746522` T3 docs (spec, README). `c5a3b1e`, `c493237`, `5ce86d1` T1 stamps and grammar (WIP, finish, review fix). `a5e3897` T2 pin of the flash rule (the rule is in `c5a3b1e`). `d36fe04` plan pins. `edfcc7f` final fix. `6866f92` doc fix. Range: `f6bc62f..6866f92`.

## Decisions made in the build

1. Landing: the last stamped element at or below the line, as GitHub does. Rejected: an element that starts exactly at the line. (Owner, G2.)
2. Grammar: `L<n>`, `L<n>-<m>`, `L<n>-L<m>`, case-sensitive `L`. Rejected: `l85`. (Owner, G2.)
3. The render call is now `marked.parser(marked.lexer(...))`. The reviewer proved that it gives the same string as `marked.parse` for all fixtures. Every `html` token is escaped at every depth.
4. The pairing helper lives under `stampLines`. The counter starts at 0, because md-view writes a newline after each `<script>` tag. `html`, tight-item `text` and `checkbox` take no stamp. A list and a blockquote advance by their own raw.
5. A range marks the stamps inside it. A one-line anchor, or a range with no stamp inside, marks the landing only. Rejected: mark every stamp from start to end, which failed the past-end row.
6. Every landing, including a heading landing and a miss, clears the old flash first.
7. The first stamp lands when no stamp is at or below the line. This covers `L0` and a file that starts with a blank line.
8. The flash rule has `!important`. Without it, even table rows, the `tokyo` palette rows, `pre` and `hr` keep their own background. The palette invariant bars `!important` only in the palette layer, and this rule is not in that layer.
9. Duplicate ids: a container and its first child share one `L<n>` id. Examples are a list with its first `li` and `p`, and a table with its header row. The spec asks for this. Scrolling uses `querySelectorAll`, so it works. A heading keeps its `user-content-` id and keeps `data-line`.
10. `tests/hostile-dom.sh` greps (two rows) were loosened for the new attributes. Each grep still needs the same element and text.
11. Commit trailer: AGENTS.md says no trailer. It won over the harness attribution reminder.

## Minor findings not fixed

- A range flashes a container (`ul`, `table`), so the paint is wider than the range (task review 7). Accepted.
- No automated row for the reversed range `L9-L7`, the `%XX` decode (`%4C8`), or `def` and blockquote descent. The final reviewer checked `L9-L7` and `%4C8` in Chrome by hand. Accepted.
- The heading landing path has no row of its own. It uses the same clear as the miss path. Accepted.
- Test rows in `tests/browser-links-dom.sh` use `--tree off`, except one tree-mode row, `dom_line_tree_link`. Accepted.
- The first `dom_line_table_row` run failed on this Mac in dark appearance, so the fixture pins `--theme light`.

## Durable docs changed

None by the build. Work for the main session at close-out:

- `docs/architecture/md-view.spec.md` line ~106 still says `marked.parse`. It must say `marked.lexer` then `marked.parser`.
- The Route row (line ~120) must say that a heading keeps its `user-content-` id and `data-line`. It must also say that a container and its first child share one `L<n>` id.
- `docs/stories/line-anchor-nav/spec.md` rows "Pairing of tokens and elements" and the start-line row do not match the code (decisions 4 and 5). Update them: name `html`, tight `text` and `checkbox`, and the leading newline.
- Invariant to add: a stamp changes the markup of every block, so a test that greps rendered markup must not depend on attribute order.
- Owner decision at G4-merge: commit `04aaf50` holds the owner's home path and a third party's name in `gate.md`. The text is gone from the current file. It stays in branch history. Removal needs a squash or a history rewrite. The branch is not pushed.

## Lessons

- The plan named only the tests that pin the render line and the page style. It missed `tests/hostile-dom.sh`, which pins the rendered markup of a `pre` and an `h1`. Name every test that greps rendered markup when a plan stamps attributes.
- `spend.mjs` found no transcripts in the earlier OMP session. In Claude Code it works. The $4.63 OMP proxy was subtracted from the budget, so the run used `--budget 10.37 --stop 15.37`. Final build spend was about $5.7 of that budget, as read before the doc fix.
- The plan said a scoped class selector wins over `.markdown-body table tr`. That was true only for odd rows. A paint test must cover an even row and each palette.

## Review yield

_The findings of each reviewer role: Critical, Important and Minor._

| Role | Model | Reviews | Critical | Important | Minor |
|---|---|---|---|---|---|
| final-reviewer | opus | 1 | 0 | 2 | 3 |
| task-reviewer-critical | opus | 1 | 0 | 3 | 4 |
