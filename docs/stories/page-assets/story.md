---
description: Move the page script and the main page style out of the shell script into lib/page.js and lib/page.css, so that the page code is plain JS and CSS files and the written page does not change.
status: in-progress
size: S
risk: contract
refs:
  - docs/architecture/md-view.spec.md
  - docs/architecture/md-view.invariants.md
---

# Story: page-assets

## Goal

`lib/md-view` has 1981 lines. About 895 of them are the page script and about 60 are the page style, in shell heredocs. Editors and reviewers read them as shell text. The next story (mermaid-viewer) adds about 140 lines of page script. This story moves the page code into two plain files first. The written page stays the same, byte for byte.

## Context

- The script copies the vendored files into the page with `cat "$self_dir/..."` (`lib/md-view:936-942`, `lib/md-view:1071-1073`). The new files use the same way. The page stays one self-contained file.
- The page style is a quoted heredoc from `lib/md-view:950` (`<style id="page">`) to `lib/md-view:1014`. A tree-only block (`lib/md-view:1017-1042`) and a one-file print rule (`lib/md-view:1044-1046`) follow it in a shell `if`.
- The page script is a quoted heredoc (`cat <<'JS'`) from `lib/md-view:1075` to `lib/md-view:1968`. It has no shell expansion.
- Exit 3 comes when a vendored file is missing (`lib/md-view:809-815`). `page_fresh` lists the inputs of the page reuse rule (`lib/md-view:858-861`).
- `Makefile` installs the files in `VENDORED` (`Makefile:13`, `Makefile:36`) and removes them at uninstall (`Makefile:47`).

## Scope

**In:**

| Part | What changes |
|---|---|
| `lib/page.js` | New file. It holds the text of the `JS` heredoc, unchanged. |
| `lib/page.css` | New file. It holds the text of the main page style heredoc, unchanged. |
| `lib/md-view` | `cat "$self_dir/page.js"` and `cat "$self_dir/page.css"` replace the two heredocs. The two files join the exit 3 check and the `page_fresh` input list. |
| `Makefile` | A new list (for example `PAGE = page.js page.css`) next to `VENDORED`. Install copies the files with mode 644, and uninstall removes them. |
| Tests | `tests/launcher.sh` checks that the installed tree has the two files. One check proves that a missing `page.js` gives exit 3. |
| Docs | The spec (exit 3 row, page head steps, reuse inputs), the README install list and the `[paths]` invariant name the two files. The two files are ours, not vendored, so the vendored-file rules do not apply to them. |

**Out:**

- The tree-only style block and the one-file print rule. They are about 30 lines inside a shell `if`, so they stay heredocs.
- Any change to the page code. The mermaid-viewer story adds the viewer.
- A split of the shell part, a build step, a bundler, a linter, or a native binary. The owner agreed with this on 2026-11-15.

## Size

S. Two new files, one script edit at four places, `Makefile`, one test, three docs. No behavior change. One small contract change: the install tree has two more files, and exit 3 covers them.

## Unknowns

1. **Byte-identical proof.** Settled at Orient, 2026-11-15. Two runs with the same inputs give the same bytes, also from two copies of `lib/` in different folders. This held for all 8 fixtures, in tree mode and in one-file mode.
2. **Trailing newline.** A heredoc ends with a newline. `cat` of a file gives the bytes of the file. The new files must end so that the page bytes stay the same. The `cmp` proof catches an error here.

## Acceptance criteria

- `lib/page.js` and `lib/page.css` hold the page code. `lib/md-view` has no `<<'JS'` heredoc and no main page style heredoc.
- The new script and `main` write byte-identical pages. This holds for each fixture in `tests/fixtures/` and `tests/browser-page/`, in one-file mode and in tree mode. The PR shows the command and its result.
- A missing or unreadable `page.js` or `page.css` gives exit 3 and writes no page.
- A newer `page.js` or `page.css` makes the page be written again (reuse rule).
- `make install PREFIX=$p` writes both files to `$p/share/md-view/`, and `make uninstall` removes them. `tests/launcher.sh` checks this.
- The spec, the README and the `[paths]` invariant name the two files. `make check` passes, and its `skip` lines are listed in the PR.

## Notes

- Owner request, 2026-11-15: "also, the script grows, should we spolit it, and/or extract js/css out of it or bring rust/native binary before we implement the viewer?"
- Owner ruling, 2026-11-15: "approved", for the plan of two stories: this story (S, with no behavior change), then mermaid-viewer. The plan has no shell split and no native binary.
- Owner-checked paths: `lib/` except `lib/md-view` and the two new files, `LICENSE`, `AGENTS.md`, `docs/architecture/`. The main session changes `AGENTS.md` ("the nine vendored files" in the table) and `docs/architecture/` at close-out.
- Branch `refactor/page-assets` from `main`. Worktree `.worktrees/page-assets`.
- Flow (from `flow-for.mjs --size S --risk contract`): tier full, docs spec and plan, orchestrator, final reviewer, gate stop, scan.
- Budget: $8. Hard stop: $10. Size S.
- Check: `make check`. A `skip all` pass proves only the tests that need no browser.
- started: 2026-11-15T09:19:21Z
- flow tier=full docs=spec,plan design=no orchestrator=yes final=final-reviewer gate=stop scan=yes verifier=plan-verifier-critical
- G2-design waived by owner, 2026-11-15: "go in autonomus mode for the refactoring one, open PR, merge, pull main branch and the go in autonoums mode for the viewer one, I'm stepping out"
- G4-merge: the owner asked for the merge in the same words. The main session merges after close-out if the check is green.
- Hooks: preflight none, verify none, status none, cleanup none. AGENTS.md names no delivery hooks.
- G2-design verified by plan-verifier-critical, 2026-11-15: PASS (second run; the first run gave FIX, and the docs were fixed)
- Gate page: the owner reads it in the PR.
