---
description: Durable contract of md-view - how a tool starts it, how it makes the page, how the page treats untrusted content, and what the host supplies.
status: ready
refs:
  - docs/architecture/md-view.invariants.md
  - docs/architecture/decisions/adr-001-standalone-tool.md
---

# Spec: md-view

## Intent

**Problem:** the terminal cannot draw every mermaid type, images or real typography.
**Approach:** a shell script writes one self-contained page and gives it to the system opener. No file manager is part of this path. A file manager runs the command like any other external viewer.

The code is `lib/md-view`. The Markdown parser is the vendored `lib/marked.min.js` (marked v18.1.3). The page has the GitHub look from two vendored style files, and `highlight.js` marks the code. The vendored files, with their versions and licenses, are in `lib/`. Each has a `*.LICENSE.md` file that names its source.

## Contract

### What starts it

Any tool that runs an external viewer can start md-view with the file name as the last argument. The file manager far2l and Midnight Commander are the tested hosts.

| Step | Rule |
|---|---|
| Command | `md-view <file.md>`. The installed launcher `$PREFIX/bin/md-view` runs `$PREFIX/share/md-view/md-view` with `exec`. |
| far2l | The user adds a File associations entry one time. md-view ships no entry, and no script edits the far2l `config.ini`. |
| Entry text | `md-view --print-association` prints the far2l entry: the mask `*.md`, the command `<absolute path of the launcher> !.!` and the steps. |
| Path | The path comes from `command -v md-view` when that is absolute. Else it is the first file that exists of the installed launcher, the checkout launcher and the script itself. A fallback path has no `..` part. An absolute path works when far2l starts with a short `PATH`, for example from the Dock. |
| Quoting | `!.!` stays unquoted because far2l escapes the name before the shell reads the command. The launcher path is quoted only if the shell needs it. |
| Midnight Commander | The user adds a rule to `mc.ext`. See the README. md-view prints no `mc.ext` text. |

The script can also run alone from any folder.

### Script interface

```
md-view [--out <page.html>] [--no-open] [--width 60|70|80]
        [--theme light|dark|auto] [--palette github|tokyo] [--browser B] [--no-cache]
        [--tree on|off] [--list-tree] <file.md>
md-view --init-config
md-view --print-association
```

| Input | Meaning |
|---|---|
| `--out <page.html>` | The page path. The folder must exist. An existing file is replaced. The script writes it directly. The cache page is not used. `--out` alone does not stop the open step. |
| `--no-open` | Writes the page and does not start a browser. |
| `--width 60\|70\|80` | The start width of the text column, in percent. A flag also makes the page ignore the saved page choice. |
| `--theme light\|dark\|auto` | The start theme. Same rule for the saved page choice. |
| `--palette github\|tokyo` | The start palette. `github` is the look of the vendored styles. `tokyo` is Tokyo Night in dark mode and Tokyo Day in light mode. Same rule for the saved page choice. |
| `--browser B` | Replaces the `browser=` key for this run. `B` is `auto`, `firefox`, `chrome`, `safari`, or an absolute path to a program. A value that is not accepted gives one line on stderr, and the script uses `auto`. |
| `--tree on\|off` | Tree mode for one run. `on` is the default. `off` gives the page of one file, with no scan. The same as the `tree=` key. |
| `--list-tree <file.md>` | Prints the encoded root on line 1, then one line `<state> <ENC>` per tree file in tree order. `state` is `page`, `big` or `cut`. A last line `cap N` shows when the cap stopped the scan. Writes no page and opens nothing. Exit 0. In one-file mode it prints line 1 and `off`. |
| `--no-cache` | Builds the page again, also if a current page exists. |
| `--print-association` | Prints the far2l File associations entry (see "What starts it"). Exit 0. |
| `--init-config` | Writes a commented sample `config.ini` if there is no file, and prints its path. An existing file, link or other entry is not changed. Exit 0. |
| `--` | The next argument is the file name, also if it starts with `-`. |
| `TMPDIR` | The folder of the fallback page. Default is `/tmp`. |
| `XDG_CACHE_HOME` | The base of the cache folder. It must be an absolute path. Else `$HOME/.cache`. |
| `XDG_CONFIG_HOME` | The base of the folder of `config.ini`. Else `$HOME/.config`. |
| `BROWSER` | Used by `auto` only, and only if it is one command name. A value that starts with `-` or has other characters is ignored with one line on stderr. |
| `MARKED_JS` | Another path for `marked.min.js`. |

| Exit | When |
|---|---|
| 0 | The page is written, and it is opened or its path is printed. With `--no-open`, nothing is printed. |
| 1 | The page cannot be written, or the opener fails. |
| 2 | No file, an unreadable file, an unknown option, a missing `--width`, `--theme` or `--palette` value, or a value that is not accepted. Also a page folder that does not exist. No page is written. |
| 3 | `marked.min.js` or a vendored style or `highlight.min.js` file is not found. No page is written. |

A `--browser` value or a `browser=` key that is not accepted is not an error. It gives one line on stderr and the script uses `auto`.

### Defaults file

The file is `${XDG_CONFIG_HOME:-$HOME/.config}/md-view/config.ini`. md-view reads no file in the old far2l path `.../far2l/settings/md-view.ini`. A host never reads or writes this file.

- Only the section `[View]` is read. A line that starts with `#` or `;` is a comment. Spaces around `=` and a CR at the line end are ignored. The last valid line of a key wins.
- `width=` is `60`, `70` or `80`. `theme=` is `light`, `dark` or `auto`. `palette=` is `github` or `tokyo`. `browser=` is `auto`, `firefox`, `chrome`, `safari`, or an absolute path to a program (on macOS also a `.app` folder).
- `tree=` is `on` (default) or `off`. `root=` is `dir` (default) or `repo`.
- `root=dir` is the folder of the opened file. `root=repo` is the nearest folder upward with `.git`, else the folder of the file. The walk stops at `$HOME` or `/`.
- `tree_depth=` is a number from 1 to 12, default 6. `tree_max_files=` is a number from 1 to 2000, default 500. A number over the ceiling gives the ceiling. A value that is not accepted is ignored.
- A value that is not accepted is ignored, and the next source applies. A `browser=` value that is not accepted also gives one line on stderr.
- The order of use is the saved page choice, then the file, then the built-in defaults: width 70, theme `auto`, browser `auto`. A flag replaces the file value for one run. The saved page choice does not apply to a page that a flag started (see "The page").
- The script never runs a value from the file. A width or a theme reaches the page only if it equals an accepted word.

### How the browser starts

| Value | Action |
|---|---|
| `auto` | The first that exists: `$BROWSER` (one command name), `open`, `xdg-open`. If none exists, the script prints the page path and exits 0. |
| `firefox`, `chrome`, `safari` on macOS | `open -a Firefox`, `open -a "Google Chrome"`, `open -a Safari`, then the page path. |
| `firefox`, `chrome` on other systems | `firefox`, or `google-chrome` then `chromium`. A command that is not found gives `auto`. `safari` gives `auto`. |
| An absolute path | The script starts that program with the page path as its one argument. |

The script starts each command with `exec` in a subshell. The page path is one argument. No config value, flag value or file name goes through `eval`, `sh -c` or an unquoted expansion. If the opener fails, the script prints one line and exits 1.

### How the page is made

1. The script writes the head. It holds a `Content-Security-Policy` meta, the page key, the state of `config.ini` (see "Page file and reuse") and the styles. `<title>` is the base name of the file. `<base href>` is the `file://` URL of its folder. The styles are four inlined vendored files (GitHub light and dark, highlight light and dark). A short stylesheet of the page follows them.
2. `sed` removes a UTF-8 BOM and each CR at a line end. It doubles each `\`, then writes `</` as `<\/` and `<!--` as `<\!--`.
3. The text goes into `<script type="text/markdown" id="md">`.
4. The script adds `marked.min.js` inline, then `highlight.min.js`, then the page script.
5. In the browser, the page script reverses the escapes and calls `marked.parse`. The result goes into `<main id="content">`, so the text shows before any network use. Then `highlight.js` marks each `pre > code` block that has a known language. A fence with no language, an unknown language or `mermaid` stays plain, and a highlight error leaves the plain block.

The start values are the attributes `data-start-width`, `data-start-theme` and `data-start-palette` of `html`. They can hold only an accepted word. A flag that sets the width or the theme adds `data-forced="1"`.

### The tree page

Tree mode is on by default. It shows the opened file and the other Markdown files under the root, in one page, with a file tree on the left.

| Part | Rule |
|---|---|
| Scan | `find` runs from the root. It skips `.git`, `node_modules`, hidden folders and hidden files, does not follow symlinks, and stops at `tree_depth` and `tree_max_files`. Names with a control byte are skipped. Only `*.md` and `*.markdown` match, in any letter case. The opened file joins the scan even if it is a symlink. A scan failure exits 2 with one line. A root of `$HOME` or `/` gives the one-file page. The scan uses POSIX `sh`, `sed`, `awk`, `grep`, `find`, `ls`, `sort` and `cksum` only. |
| Files in the page | Each tree file with state `page` goes in the page, in tree order. The opened file is first and counts last. A file over 1 MiB is `big`. A file that would take the Markdown text over 8 MiB is `cut`. A `big` or `cut` file stays in the tree only. |
| Page contents | `<script type="text/markdown" id="md">` for the opened file. One `<script type="text/markdown" class="md-file" data-path="ENC">` per other file. A `<script type="text/plain" id="md-tree">` holds one `<state> <ENC>` line per tree file. |
| Attributes on `html` | `data-tree="on"`, `data-root`, `data-files`, `data-cap`, `data-panel="open\|closed"`. The page uses a number only if it matches `^[0-9]+$`, and an `ENC` only if it matches `^[A-Za-z0-9._~/%-]*$`. |
| Route | The page URL without a hash is the page. `#/ENC` shows that file. `#/ENC#FRAG` also scrolls to the anchor. Back and Forward move in the browser history. |
| Links | The page script reads each link of the rendered text. A relative target is resolved against the file of the link. `%XX` is decoded once before the check. A target is in the root if no `..` segment leaves the root and it stays under the root as a real path. A target outside the root, an absolute path or a `file:` target shows as text with the note `not in this tree`. A link to a page file gets `href` = page URL `#/ENC` and the note is not added. A link to a `big` or `cut` file goes there, and that file shows its limit note. |
| Raw HTML | Raw HTML shows as text in tree mode, as in one-file mode. |
| Panel | Fixed on the left, full height, 260 px wide, own scroll. The root name at the top. Folders are `details` with the name in `summary`. Files are links. The folders on the path of the shown file are open. The shown file has `aria-current="page"` and the panel scrolls it into view. A `big` or `cut` file has a low-contrast style. At the cap the last line is `Showing the first N files.`. |
| Toggle | One button at the top-left, at the right edge of the panel when open, at the left edge when closed. `aria-expanded` and `aria-controls`. The key `b` does the same, and follows the rule of the other keys. |
| Saved state | `localStorage` key `md-view-tree` with `open` or `closed`, inside `try/catch`. No saved value gives `open`. `tree=off` removes the panel, and a saved value cannot bring it back. |
| Width | `html` has `data-panel`. When the panel is open, `body` gets `padding-left` of 260 px and the gutter. The text column takes the width setting of the space that is left. |
| Narrow window | Below 700 px the panel and its toggle are hidden, and `b` does nothing. |
| Focus | After a click in the tree or on a link, the focus goes to `#content`. |
| Print | The panel and its toggle are hidden. |
| One-file mode | `tree=off` or `--tree off`, or a root of `$HOME` or `/`, gives the page of one file: no scan, no panel markup and no panel CSS. `html` has `data-tree="off"` and `data-tree-why="ini\|flag\|home\|slash"`. The popover shows why. |

### The page: look, gear and keys

| Part | Rule |
|---|---|
| Look | The body has the class `markdown-body`. The page holds one light and one dark GitHub style, and one light and one dark highlight theme. The page script enables one of each pair with the `media` attribute. |
| Width | `html` has `data-width` with 60, 70 or 80. The column is centered and has that width in percent. With the tree panel open, the percent applies to the space on its right. |
| Narrow window | Below 700 px the column has the full width, and the gear and the tree panel are hidden. The keys still work, so `?` still opens the popover. |
| Palette | `html` has `data-palette` only for `tokyo`. A color layer of rules, each starting with `html[data-palette]`, sets colors for the page text, the code, the tree panel, the gear and the popover. The layer sets colors only (no `display`, no `!important`). The page script holds one color table for Tokyo Night and Tokyo Day. It writes the `--p-*` variables on `html` and gives mermaid its `themeVariables`. A bad saved word is ignored. |
| Theme | `html` has `data-theme` with `light`, `dark` or `auto`. `auto` follows `prefers-color-scheme` and changes with it. |
| Gear | One low-contrast button, fixed in the top-right corner. It takes no layout space. It opens a popover. |
| Popover | Width buttons 60, 70, 80. Theme buttons light, dark, auto. A `Style` row with the buttons github and tokyo. The keys. A line to paste into `config.ini`. A Reset button. A click outside or Esc closes it. |
| Keys | `t` changes the theme in the order light, dark, auto. `s` changes the palette (github, tokyo). `w` changes the width in the order 60, 70, 80. `b` opens or closes the tree panel. `?` opens the popover. The page ignores a key with Ctrl, Alt or Meta held, and when a form field has the focus. |
| Saved choice | The page saves the choice in `localStorage`, keys `md-view-width`, `md-view-theme`, `md-view-palette` and `md-view-tree`. Order of use: the saved choice (unless `data-forced`), then the start value. Reset removes the saved choice and applies the start values with no reload. |
| Storage blocked | If a read or write throws, the page still works. The popover then shows a notice and the lines to paste: `[View]`, `width=N`, `theme=T`, `palette=P`, with the current values. |
| Print | The gear, the popover, the tree panel and its toggle are hidden. |
| Offline | Text, style and highlight show with no network. A mermaid block shows its source. |

### How diagrams render

A fence is a diagram when the first word of its language is `mermaid`. This match is case-sensitive. Other fences stay plain code.

1. The page adds one script element for mermaid 12.3.0 from `cdn.jsdelivr.net`, with a `sha384` integrity hash and `crossorigin="anonymous"`. It does this only if the page has a diagram.
2. On load, `mermaid.initialize` runs with `startOnLoad: false` and `securityLevel:'strict'`. With the palette `github`, the theme is `dark` or `default`, as the used page theme says. With `tokyo`, the theme is `base` with `themeVariables` from the palette table, and `securityLevel:'strict'` stays. When the used theme changes, the page draws each diagram again from its saved source text. A key, a button, or the system in `auto` can change it. One batch runs at a time, with a time limit of 10 s. A batch that waits is not added twice. A redraw is skipped if the drawn pair is the same. The pair is the palette and the used theme.
3. `mermaid.parse` checks each diagram alone. A diagram that fails shows its source and its error. The others still draw.
4. `mermaid.run` draws the good diagrams.

### Content cases

| Case | Fixture | Result |
|---|---|---|
| Normal text, table, list, code | `plain.md` | Rendered in the GitHub look. Empty files give an empty page. |
| Code fence with a known language | none | Highlighted. A fence with no or an unknown language stays plain. |
| `width=<script>` in `config.ini` | none | The value is ignored. Width is 70. The page has no script from the value. |
| A diagram | `diagram.md` | An `<svg>` in the block. |
| `</script>` in the text | `hostile.md` | It cannot end the script element. The rest of the file renders. |
| Raw HTML, an `onerror` attribute | `hostile.md` | The `html` renderer shows it as text. No element is made. |
| Link with a `javascript:`, `vbscript:` or `data:` target | none | The page removes `href` after the parse, so entity-encoded schemes are caught too. |
| Remote image | `remote.md` | `img-src data: file:` blocks it. The text after it shows. |
| Local image, relative link | none | These resolve against `<base href>`. |
| Broken diagram | `broken-diagram.md` | The source and a `.mermaid-error` line show. The next diagram draws. |
| Literal `<\/` and `<\!--` | `escapes.md` | They come back as written. |
| CDN blocked or integrity failure | none | Each diagram shows as a code block, with no error line. |
| CDN stalled | none | The text and the diagram source show while the script waits. |
| Tree with a hostile name | a file named `\"><script>.md` | The name shows as text in the tree. No element is made. |
| Link out of the root | `../outside.md`, `/etc/x.md`, `file:` URL, `%2e%2e/x.md` | Text, with the note `not in this tree`. |
| Link to a page file | two files in one root | The other file shows in the same page, and Back returns. |
| Link to a `big` or `cut` file | a file over 1 MiB | The file shows its note, `This file is too large for the page.` or `This file is over the page limit.` |
| Tree over the cap | `tree_max_files=5` | Five files and the line `Showing the first 5 files.` |
| `tree=off`, `--tree off`, root `$HOME` or `/` | none | The page of one file, and the popover says why. |

The fixtures are in `tests/fixtures/`.

The policy is `default-src 'none'; script-src 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'unsafe-inline'; img-src data: file:`. The GitHub look did not change it, because the script inlines every vendored file.

### Page file and reuse

| Rule | Detail |
|---|---|
| Name | `${XDG_CACHE_HOME:-$HOME/.cache}/md-view/<base>-<cksum>.html`. `<base>` is the file name with each byte outside `A-Za-z0-9._-` changed to `_`, cut to 40 bytes. `<cksum>` is the first field of `cksum` of the real path of the file. |
| Folder | The folder has mode 700. The page file has mode 600. A link or a non-plain file at the page path is not used. |
| Fallback | If the folder cannot be made or used, the script prints one line on stderr and writes `${TMPDIR:-/tmp}/md-view-<pid>.html`. |
| Write | The script writes a temporary file next to the page, then moves it over the page. A reader never sees a half page. The temporary file goes on an error or a signal. `--out` keeps the direct write. |
| Reuse | The script opens the old page and writes nothing if three things hold. The page exists. No input is newer than the page. The head of the page has the key of this run and the state of `config.ini`. |
| Inputs | The Markdown file (by modification time only), `md-view`, `marked.min.js`, the five other vendored files, and `config.ini`. In tree mode also the scan: the page holds a line with the tree of this scan, and a newer tree file rebuilds the page. |
| Key | `<meta name="md-view-key" content="w=<width>;t=<theme>;p=<palette>;f=<0 or 1>;tr=<on or off>;r=<root mode>;d=<depth>;n=<max files>">`, and a `md-view-tree` comment with the state of this scan in tree mode. A comment `md-view-ini` holds the size and the time of `config.ini`, or `none`. The script reads both from the head of the page only, so the Markdown text cannot fake them. |
| No reuse | `--no-cache` and `--out` always build. The fallback page is never reused. |
| Cleanup | The script never deletes a page. The operating system cleans the temporary folder. The cache folder grows with the files that the user opens. |

### Host dependencies

| Need | Detail |
|---|---|
| Shell tools | POSIX `sh`, `awk`, `sed`, `cat`, `basename`, `dirname`, `cksum`, `cut`, `find`, `grep`, `ls`, `mv`, `mkdir`, `chmod`, `sort`. `make` and `install` for the install. |
| Opener | `open`, else `xdg-open`. If both are missing, the script prints the page path and exits 0. |
| Browser | Any browser that the opener starts. Chrome is tested. Firefox is a manual check. |
| Network | `cdn.jsdelivr.net` for a page with a diagram. No other network use. |
| Install | `make install PREFIX=$p` puts `md-view` (mode 755) and the nine vendored files (mode 644) in `$p/share/md-view/`, and the launcher in `$p/bin/md-view`. The default `PREFIX` is `/usr/local`. `PREFIX` must be absolute and must not hold a single quote. `make uninstall` removes exactly these files. |

`md-view` reads `marked.min.js` and the other vendored files from its own folder (`self_dir`), so the files must stay together. The checkout launcher `bin/md-view` finds `lib/` from its own folder and does not follow symlinks.

### Boundaries

**Always:**

- Treat the file as untrusted.
- Show the text before any network use.
- Keep the mermaid URL pinned, with its hash.
- Let a width or a theme reach the page only as an accepted word.
- Run the browser with no shell evaluation.

**Ask first:** add another network origin, ship a default association, or add keys to `config.ini`.

**Never:**

- Change the Markdown file.
- Run raw HTML from the file.
- Load a remote image.
- Edit a config file of the host, or read `mermaid.min.js`.
- Run a value from `config.ini` or a flag as a command, except an absolute path that names a program for `browser=` or `--browser`.

## Tests

`make check` runs four tests in order and stops at the first failure.

| Test | Holds |
|---|---|
| `tests/browser-page.sh` | Needs only `sh`. It drives `lib/md-view` with `--no-open`. It checks the flags, the exit codes and `config.ini`. It checks that an old far2l config file has no effect. It also checks the page name, the reuse rule, the temporary file, the key and the page text. The gear, the popover, the keys and the saved choice are checked as page text only. A person checks them in Firefox and Chrome. |
| `tests/browser-links-dom.sh` | Headless Chrome. The hash route, the link rules, images, heading ids and anchors. |
| `tests/hostile-dom.sh` | Headless Chrome. The untrusted content rows, the CSP, the page written with `--out`, and the `--print-association` text with a hostile file name. |
| `tests/launcher.sh` | The checkout launcher, the installed launcher, `make install` and `make uninstall`. |

A test with no Chrome or no network prints `skip` lines and exits 0. A pass with `skip` lines proves less. Read the `skip` lines before you trust a pass.

The rows of `tests/hostile-dom.sh` are:

| Part | Check rows |
|---|---|
| Page shape, CSP, pinned CDN script | `plain:` rows |
| Paths with spaces, empty file, BOM and CRLF | `paths with spaces`, `empty file`, `BOM and CRLF` |
| Diagrams, stalled and refused CDN | `diagram:`, `stalled CDN:`, `refused CDN:` |
| Untrusted content | `hostile:`, `escapes:`, `remote image:`, `broken diagram:` |
| Script interface | `usage:`, `leading dash`, `open:` |
| Association text | `association:` rows |

## Risks and open questions

These are parked findings, with the state checked against `lib/md-view`.

### Defects

| Defect | Evidence |
|---|---|
| The printed mask is `*.md` only. The viewer rule of far2l also takes `.markdown`. | `print_association` |

### Parked findings that remain open

- The reuse rule compares the Markdown file by modification time only. It misses a package upgrade that keeps the old times.
- A read error inside the page write is not detected, so a bad page can be reused.
- A dark page can flash light before the page script runs.
- The test of the page script is text only. A syntax error in the script would pass.
- After a mermaid timeout, pressing the same theme does not retry. A run that ends after the timeout can still write its SVG.
- Esc closes the popover with no focus return when the gear is hidden under 700 px.
- The Firefox check of `localStorage` between two `file://` pages is manual (Chrome 156 shares the value).
- `--out` equal to the input file destroys the input. The redirection empties the file before `sed` reads it. A file manager that passes the file name only cannot reach this case.
- The fallback temp name is predictable when `TMPDIR` is not set. The cache page does not have this problem (folder mode 700, noclobber write, a link is refused).
- `LC_ALL=C` is exported to `open` and `xdg-open`.
- File names with `<`, `>` or a leading `#` break the printed command. An `--out` name that starts with `-` reaches `open`.
- The install on Linux is not tested on a Linux host.
- The stalled-CDN row of `tests/hostile-dom.sh` can pass if `nc` cannot bind.

### Other risks

- The policy has `'unsafe-inline'`, so it does not stop an inline handler. The `html` renderer and the escapes are the only guards against script in the file.
- The policy allows scripts from all of `https://cdn.jsdelivr.net`, not from one URL. Only the page script pins the mermaid URL (`MERMAID_URL`) and its hash (`MERMAID_SRI`). A script from another jsdelivr path would pass the policy.
- A page with a diagram sends a request to the CDN. The CDN sees the IP address and the time. The file text stays local.
- Files in another encoding go into a page that says UTF-8, so non-ASCII text shows wrong.
- A new vendored `marked` or `highlight.js` needs a new check for `</script` and `</style`. Each current file has one `<!--`, and the HTML parser accepts it in a script element.
