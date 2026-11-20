# Plan: bake-pages

Tier: lite (`flow tier=lite docs=plan design=no orchestrator=no final=final-reviewer-light gate=read-later scan=no verifier=none`). No `spec.md`: the spec is the section below.

## Spec

`md-view --bake <dir> <file.md>` writes a folder for upload and opens nothing.

| Item | Exact rule |
|---|---|
| Flag | `--bake <dir>` takes one value. No value → exit 2. `--bake <dir>` with `--out <page.html>` → exit 2. `<dir>` must exist (its folder check at `lib/md-view:817` covers it), else exit 2. |
| Page path | `<dir>/index.html`. The direct write path of `--out` is used (`lib/md-view:972-980`), so `cached=0` and the page always builds. |
| Tree mode | Bake uses tree mode. `--tree off` wins over bake. A `tree=off` key in `config.ini` does not: bake sets the value a flag would. A root of `$HOME` or `/` still gives the one-file page. |
| Head | `<base href="./">` replaces the `file://` base line. The CSP line keeps every origin and changes `img-src` to `data: 'self'` for a baked page only. |
| Publish set | Two target sets, read from the Markdown text of every file that joins the page (the opened file and each `page` tree file): the image targets of `![alt](target)`, `![alt][ref]` with `[ref]: target`, and the link targets of `[text](target)` that are not Markdown files. A target with a scheme, a leading `/`, a dotted part, a `node_modules` part, a byte below `0x20`, or a depth over `tree_depth` is not published. A target is resolved against the folder of its own file, under the root, the way `fileBaseFor` does. An image target must end in `png`, `jpg`, `jpeg`, `gif`, `svg` or `webp`, in any letter case. `%XX` is decoded once. |
| Copy | `mkdir -p` the parent, then `cp -- <root>/<path> <dir>/<path>`. Skip a path with a symlink in its chain (the file and each parent below the root). Copy the assets first, then `index.html`, so the folder never holds a half site. |
| Chrome | Unchanged: the page is rendered once with headless Chrome, and the DOM is written to `index.html`. With no Chrome, the unbaked page is written with one line on stderr. |
| Print | The absolute path of `<dir>` on stdout, one line, last, exit 0. No browser. |

### Done

`make check` exits 0, and `sh tests/browser-page.sh 2>&1 | grep -c '^ok bake'` prints at least 9.

## Global Constraints

- POSIX `sh` only. Tools: `sh`, `awk`, `sed`, `grep`, `find`, `ls`, `mv`, `mkdir`, `chmod`, `cp`, `wc`, `cksum`, `basename`, `dirname`, `cut`, `sort`. Add no new tool.
- Files this story may touch: `lib/md-view`, `tests/browser-page.sh`, `docs/architecture/md-view.spec.md`, `docs/architecture/md-view.invariants.md`, `docs/architecture/decisions/adr-004-bake-folder.md`, `README.md`, `docs/stories/bake-pages/`.
- Every value from a file is untrusted. No `eval`, no `sh -c`, no unquoted expansion. Quote every path; use `--` with `cp`, `mkdir` and `rm`.
- Keep the CSP rule set: `default-src 'none'`, `script-src 'unsafe-inline' https://cdn.jsdelivr.net`, `style-src 'unsafe-inline'`, and `img-src` as the Spec row says.
- Test rows live in `tests/browser-page.sh` as `case_page_bake_*` functions, added to the `for c in` runner list near `tests/browser-page.sh:3017`. A name is `bake:<what>` in its `bad` lines.
- Docs use ASD-STE100 Simplified Technical English: short sentences, active voice.
- Commit message: a short imperative summary line, a blank line, then the body. No trailer. One commit per task.
- Check: `make check`. Owner-checked paths: none.

Settled by the fresh read, binding:

- stdout in bake mode holds one line: the folder path. The opener's page-path print
  (`open_page`, `lib/md-view:297`) does not run for a baked page.
- The printed path is `$(cd "$bake_dir" && pwd)` of the flag value, so a relative
  `--bake site` prints an absolute path.
- A root-relative path has no `./` prefix and no leading slash. `tree_depth` counts
  path parts with the file name last: `a/b/c.md` is depth 3 and passes
  `tree_depth=3`.
- Reference-style target text is the token after `[ref]:`. Strip a `<...>` wrapper,
  then a `"title"` at the end.
- One-file bake resolves a target against the folder of the opened file, as the page
  does. A copy goes to `<dir>/<path under that folder>`.
- The bake rows share one new fixture folder `tests/fixtures/bake/` with
  `index.md`, `guide/img/logo.png`, `guide/img/shot 1.png`, `guide/img/photo.JPG`,
  `data/report.csv`, `notes.md`, `.env`, `.git/config`, `node_modules/pkg/readme.md`,
  `a/b/c/d/e/f/deep.md`, `img/-a.png` and a symlink `link.png` to
  `guide/img/logo.png`. `index.md` names the picture, the `.csv` link, the `%20`
  picture, the `.env` link, a `-a.png` picture and `link.png`.
- T1 rows use the existing `$sample` fixture and `--tree off`. Every bake row uses
  `--tree off --no-open --bake "$dir"`, accepts a Chrome stderr note, and asserts
  exit 0 and the files on disk.
- A bake row names the check in its `bad` line as `bake:page …` (T1) or
  `bake:asset …` (T2).

## T1: bake writes the folder page

**Depends on:** none
**Done check:** `sh tests/browser-page.sh 2>&1 | grep -c '^ok bake:page'` prints at least 4
**Role:** implementer — review final

Change `--bake` from a bare flag to a value-taking flag:

- `usage` (`lib/md-view:49`): `[--bake <dir>]`.
- Parse (`lib/md-view:623`): `[ $# -ge 2 ] || usage`, `bake_dir=$2`, `flag_bake=1`.
- After the flag loop and `read_ini`, with the start values (`lib/md-view:677-690`): when `flag_bake=1` and `--out` is set, exit 2. When `flag_bake=1` and `flag_tree` is empty, force tree mode the way a flag does.
- Page path (`lib/md-view:777-779`): `flag_bake=1` sets `page=$bake_dir/index.html`, `out=$bake_dir/index.html`, `cached=0`.
- Base line (`lib/md-view:870`): a baked page writes `<base href="./">`.
- CSP: the head writes the CSP from a variable, so a baked page gets `img-src data: 'self'` and every other page keeps `img-src data: file:`.
- Chrome pass (`lib/md-view:1115-1133`) and the write path keep working with the new page path.
- Print (`lib/md-view:1135-1138`): a baked page prints the absolute `<dir>` on stdout and skips `open_page`.

New rows in `tests/browser-page.sh`, all with `bake:page` names:

- `case_page_bake_dir` — `--bake <dir>` writes `<dir>/index.html`, prints the absolute `<dir>` as its last stdout line, exit 0.
- `case_page_bake_head` — the page has `<base href="./">` and `img-src data: 'self'`.
- `case_page_bake_missing_dir` — a `<dir>` that does not exist exits 2 and writes nothing.
- `case_page_bake_flag_shape` — `--bake` with no value exits 2; `--bake <dir> --out <p>` exits 2.

## T2: bake publishes the Markdown-named assets, and the docs

**Depends on:** T1
**Done check:** `sh tests/browser-page.sh 2>&1 | grep -c '^ok bake:asset'` prints at least 5
**Role:** implementer — review final

Add the publish set before the page write:

- `bake_ok PATH` — no part starts with `.`, no `node_modules` part, no byte below `0x20`, part count at most `tree_depth`.
- `bake_ext_ok PATH` — the last part ends in `png`, `jpg`, `jpeg`, `gif`, `svg` or `webp`, in any letter case.
- `bake_link_chain PATH` — true when no part of the path, from the leaf to the root, names a symlink.
- `bake_copy REL` — `bake_ok`, then `bake_link_chain`, then `mkdir -p` and `cp --`.
- One `awk` pass over the Markdown text of each page file collects the two target sets: `![alt](target ...)`, `[ref]: target` used by `![alt][ref]`, and `[text](target)` whose target is not `*.md` or `*.markdown` in any case. Strip a `#frag` and a `"title"`, decode `%XX` once, drop a scheme, a leading `/` and a target that leaves the root with `..`, and resolve the rest against the folder of its own file.
- The copy runs before the page write, in the same bake branch.

Docs:

- `docs/architecture/md-view.spec.md`: a `--bake <dir>` row in Script interface, replacing the `--bake` row; a `### Baked site` section with the head, publish-set, copy and print rules; the Tests table gains a `bake:` line.
- `README.md`: the `--bake` row says the flag names the output folder.
- `docs/architecture/md-view.invariants.md`: one line — a baked folder holds `index.html` and only the assets that Markdown names and the tree-scan rules accept.
- `docs/architecture/decisions/adr-004-bake-folder.md`: from `docs/.templates/adr.md`. A baked site is one mirrored folder with `index.html`, chosen over a flat folder with an asset manifest.

New rows in `tests/browser-page.sh`, all with `bake:asset` names:

- `case_bake_asset_image` — a fixture tree with `![](img/logo.png)` copies `img/logo.png` to `<dir>/img/logo.png`.
- `case_bake_asset_link` — a link to `data/report.csv` copies `data/report.csv`.
- `case_bake_asset_skips` — `.env`, `.git/config` and a `node_modules` target are not copied; a name starting with `-` is copied with its name.
- `case_bake_asset_symlink` — an image behind a symlink, and an image under a symlinked folder, are not copied.
- `case_bake_asset_ext` — a `.csv` image target is not copied; `logo.svg` and `PHOTO.JPG` are.
- `case_bake_asset_percent` — `![](img/shot%201.png)` copies `img/shot 1.png`.
