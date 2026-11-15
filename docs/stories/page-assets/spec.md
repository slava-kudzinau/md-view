---
description: The exact contract of the page-assets story. The page script and the main page style move to lib/page.js and lib/page.css, and the written page stays byte-identical.
---

# Spec: page-assets

## `lib/page.js` and `lib/page.css`

| Item | Rule |
|---|---|
| `lib/page.js` | Holds the lines between `cat <<'JS'` and the `JS` end line of `lib/md-view` on `origin/main` (lines 1076 to 1967), with no change. |
| `lib/page.css` | Holds the lines from `body { margin: 0; padding: 2em 16px; }` to `html[data-palette] .hljs-strong { font-weight: bold; color: inherit }` (lines 952 to 1013 on `origin/main`), with no change. The line `<style id="page">` stays in `lib/md-view`. |
| Mode | Both files have mode 644 in the repo and in the install. |
| Not vendored | The two files are md-view code. They have no `*.LICENSE.md` file, and the vendored-file rules of `AGENTS.md` do not apply to them. |

## `lib/md-view`

| Call | Result |
|---|---|
| The page is written | `cat "$self_dir/page.css"` writes the main page style after the line `<style id="page">`. `cat "$self_dir/page.js"` writes the page script in the last `<script>` element, after `highlight.min.js`. The tree-only style heredoc and the one-file print rule heredoc stay in the script. |
| Any fixture, one-file or tree mode | The written page is byte-identical to the page that `lib/md-view` on `origin/main` writes for the same input, flags and config. |
| `page.js` or `page.css` is missing or not readable | Exit 3. Stderr is exactly `md-view: cannot find page.js` (or `page.css`). No page is written. The check is in the same loop as the vendored files. |
| `page.js` or `page.css` is newer than the cache page | `page_fresh` fails, so the page is written again. |

## `Makefile`

| Call | Result |
|---|---|
| `make install PREFIX=$p` | Writes `$p/share/md-view/page.js` and `$p/share/md-view/page.css`, mode 644, next to the script. A new variable `PAGE = page.js page.css` names them. `VENDORED` does not change. |
| `make uninstall PREFIX=$p` | Removes the two files. |

## Docs

| Doc | Change |
|---|---|
| `README.md` | The install list names the script, `page.js`, `page.css` and the nine vendored files. |
| `docs/architecture/md-view.spec.md` | Exit 3 row, step 1 of "How the page is made", the "Inputs" row of the reuse table. The main session changes it at close-out. |
| `docs/architecture/md-view.invariants.md` | The `[paths]` rule names the two page files. The main session changes it at close-out. |
| `AGENTS.md` | The `make install` row and the `lib/` rows name the two page files. The main session changes it at close-out. |

## Done

`make check` exits 0 with no `FAIL` line. The byte-identical proof (plan, T1 done check) prints no `DIFF` line for each file in `tests/fixtures/*.md` and `tests/browser-page/*.md`, in `--tree on` and in `--tree off`. The PR shows this command and its output, and lists the `skip` lines of `make check`.

The exit 3 test covers a missing file. The loop also checks `-r`, so an unreadable file gives exit 3 too. The current test of the vendored files covers only a missing file, and this story keeps that form.

## Out of scope

- The tree-only style and the one-file print rule. They stay heredocs.
- Any change to what the page does.
- A build step, a bundler, a linter, a split of the shell part, or a native binary.
