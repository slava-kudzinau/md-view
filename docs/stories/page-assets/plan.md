---
description: The task plan of the page-assets story. One task moves the page code to lib/page.js and lib/page.css, installs the two files and updates the tests and the README.
---

# Plan: page-assets

Spec: `spec.md` (governs exact values). This story has no design doc.

## Global Constraints

- Write POSIX `sh` only. Add no new tool or package. (AGENTS.md, global policies)
- Do not change the text of the page code. Move it byte for byte. Do not change the CSP meta, `securityLevel:'strict'`, `MERMAID_URL` or `MERMAID_SRI`. (AGENTS.md, global policies)
- Do not edit the vendored files in `lib/` (`*.min.js`, `*.css` other than `page.css`, `*.LICENSE.md`). (AGENTS.md, global policies)
- Do not edit `AGENTS.md`, `LICENSE` or `docs/architecture/`. The main session changes them at close-out. Owner-checked paths: `lib/` except `lib/md-view`, `lib/page.js` and `lib/page.css`; `LICENSE`; `AGENTS.md`; `docs/architecture/`.
- Do not remove a `skip` rule in a test. (AGENTS.md, tests)
- The two page files are not vendored. Do not add them to the `vendored=` list of `tests/browser-page.sh`, because `case_vendor_no_close_tag` reads that list, and `page.js` holds one `<!--` (`lib/md-view:1169`). Use a new list `page_code='page.js page.css'`.
- `lib/md-view` reads its files from `self_dir`. A test that copies `lib/md-view` to a new folder and runs it there must also copy the two page files, or the copy exits 3. `case_tree_off_same_page` runs an old script from git, so it does not need them. (Invariant `[paths]`)
- Exit 3 message: `md-view: cannot find <name>`, the same form as for the vendored files.
- Commit message: a short imperative summary line, a blank line, an optional body, a blank line, then the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Use this trailer exactly, whatever model you are. One commit for the task.
- Check: `make check`. Read the `skip` lines before you trust a pass.

## T1: Move the page code to two files and install them

**Depends on:** none
**Done check:** `make check` exits 0, and this command prints `same` and no `DIFF` or `NOT MOVED` line:

```sh
test -f lib/page.js && test -f lib/page.css && ! grep -q "<<'JS'" lib/md-view && ! grep -qF 'body { margin: 0; padding: 2em 16px; }' lib/md-view && grep -qF 'cat "$self_dir/page.js"' lib/md-view && grep -qF 'cat "$self_dir/page.css"' lib/md-view || echo "NOT MOVED"
T=$(mktemp -d); export XDG_CONFIG_HOME=$T/cfg; git archive origin/main lib | tar -x -C $T; for f in tests/fixtures/*.md tests/browser-page/*.md; do for tr in on off; do $T/lib/md-view --no-open --no-cache --tree $tr --out $T/a.html $f >/dev/null 2>&1; lib/md-view --no-open --no-cache --tree $tr --out $T/b.html $f >/dev/null 2>&1; cmp -s $T/a.html $T/b.html || echo "DIFF $f $tr"; done; done; echo same
```

**Role:** implementer — review task-reviewer-critical (a public contract: exit 3, the reuse inputs, the install tree)

1. Create `lib/page.js` from lines 1076 to 1967 of `lib/md-view` (the body of the `cat <<'JS'` heredoc). Create `lib/page.css` from lines 952 to 1013 (the body of the main style heredoc, after `<style id="page">`). Line numbers are for `origin/main`. Use `sed -n` on the line ranges so the bytes do not change. Check the last newline: `cat` of the file must give the same bytes as the heredoc. Give both files mode 644.
2. In `lib/md-view`, replace the JS heredoc with `cat "$self_dir/page.js"`. Split the `cat <<'HTML'` block that holds `<style id="page">`. It still prints `<style id="page">`, and then `cat "$self_dir/page.css"` prints the rules. The tree-only and print heredocs follow as now. The `cat <<'HTML'` block near line 1048 still prints `</style>`. Update the comments above both places.
3. Add `page.js` and `page.css` to the exit 3 loop (`lib/md-view:809-815`) and to the `page_fresh` input loop (`lib/md-view:858-861`). Update the comment of the exit 3 loop, so that it names the page files too.
4. In `Makefile`, add `PAGE = page.js page.css` after `VENDORED`, with a one-line comment. Install the `PAGE` files with `install -m 644` in the same recipe as the vendored files. Remove them in `uninstall` in the same way as the `VENDORED` files.
5. In `tests/browser-page.sh`:
   - Add `page_code='page.js page.css'` after `vendored=` (line 931), with a one-line comment. Do not change `vendored=`.
   - In `scratch()` (near line 1021), copy `$vendored $page_code`.
   - In `case_cache_rebuild_on_edit` (lines 1132 and 1138), loop over `$vendored $page_code`. This case is the test of the rule "a newer `page.js` or `page.css` makes the page be written again".
   - The exit 3 case near line 673 has two lists. Add the two names to the outer list (`for f in ...`, the file to leave out). Add them to the inner list too (`for g in ...`, the files to copy). The case then proves exit 3 for each page file.
   - Do not change `case_vendor_no_close_tag` or `case_tree_off_same_page`.
   - Update the comments at line 672 ("A missing vendored file ...") and line 1020 (above `scratch()`), so that they name the page files too.
6. Run `grep -n 'cp "\$md_open"' tests/*.sh` to find any other copy of the script. A copy that runs the script to write a page must also get the two files. A copy that only prints text (for example `--print-association`) needs no change.
7. `tests/launcher.sh` loops over `lib/*` at install and uninstall, and checks mode 644 for each file (line 82). It covers the new files with no code change. Change the comment at `tests/launcher.sh:110` from "the 11 installed files" to "the 13 installed files".
8. In `README.md`, replace the install line about `$PREFIX/share/md-view/md-view`. Use this text: ``- `$PREFIX/share/md-view/md-view`, the script, its page code `page.js` and `page.css`, and the nine vendored files. The script reads them from its own folder.`` No other README line names the files in `lib/`.
9. Run the done check. It runs each fixture with `--tree on` and `--tree off`, so it covers the tree-only style and the one-file print rule too. A `DIFF` line means the bytes moved wrong. Fix the files, not the test.
