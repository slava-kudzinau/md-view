---
description: md-view shows a Markdown file as a web page in your browser, with GitHub style, code colors and mermaid diagrams.
---

# md-view

md-view turns a Markdown file into one web page and opens it in your browser. The page has the GitHub look, colored code blocks and mermaid diagrams. It shows the other Markdown files of the folder in a file tree. It is a POSIX shell script. Run it by hand, or let a file manager such as far2l or Midnight Commander start it.

The file can come from anywhere, so md-view treats it as untrusted. Raw HTML shows as text. Remote images do not load. Mermaid runs in strict mode.

## Install

You need a POSIX shell, `make` and a browser. macOS and Linux are the target systems. Only macOS is tested often.

```sh
git clone https://github.com/slava-kudzinau/md-view.git
cd md-view
make install PREFIX=$HOME/.local
```

`PREFIX` is `/usr/local` by default. It must be an absolute path and must not hold a single quote. The install writes these files:

- `$PREFIX/bin/md-view`, a two-line launcher.
- `$PREFIX/share/md-view/md-view`, the script, and the nine vendored files that it reads from its own folder.

Put `$PREFIX/bin` on your `PATH`. To remove md-view, run `make uninstall PREFIX=...` with the same `PREFIX`.

To run from the checkout with no install, use `bin/md-view`. Put the `bin` folder on `PATH`. Do not link to the file, because the launcher finds `lib/` from its own folder.

To run the tests, use `make check`. A test that has no Chrome or no network prints `skip` lines and passes. Read the `skip` lines before you trust a pass.

## Usage

```sh
md-view [options] <file.md>
```

| Option | Meaning |
|---|---|
| `--out <page.html>` | Write the page to this path. |
| `--no-open` | Write the page and do not start a browser. |
| `--width 60\|70\|80` | Start width of the text column, in percent. |
| `--theme light\|dark\|auto` | Start theme. `auto` follows the system. |
| `--palette github\|tokyo` | Start palette. See [Palettes](#palettes). |
| `--browser auto\|firefox\|chrome\|safari\|<path>` | The browser. A path is an absolute path to a program. |
| `--tree on\|off` | Show the file tree of the root folder, or one file only. |
| `--list-tree` | Print the root and the tree files. Write no page. |
| `--no-cache` | Build the page again. |
| `--init-config` | Write a commented sample `config.ini`, and print its path. |
| `--print-association` | Print the far2l File associations entry. |

The page goes to `${XDG_CACHE_HOME:-$HOME/.cache}/md-view/` and md-view reuses it while no input changed. In the page, press `t` to change the theme, `s` to change the palette and `w` to change the width. Press `b` to open or close the file tree. Press `?` for help.

A diagram needs internet, because mermaid loads from a CDN. Without it, the page shows the source of the diagram.

## Palettes

A palette is a set of colors for the page, the code blocks and the diagrams. The default is `github`, the GitHub look. The palette `tokyo` has two versions: Tokyo Night, a dark version, and Tokyo Day, a light version. The theme picks the version. The theme `dark` gives Tokyo Night. The theme `light` gives Tokyo Day. The theme `auto` follows the system and changes with it.

To pick a palette, use `--palette tokyo`, or write `palette=tokyo` in the section `[View]` of `config.ini`. In the page, press `s`, or use the row Style in the settings. The page remembers your choice.

The `tokyo` colors come from [folke/tokyonight.nvim](https://github.com/folke/tokyonight.nvim), commit `cdc07ac78467a233fd62c493de29a17e0cf2b2b6`, files `extras/lua/tokyonight_night.lua` and `extras/lua/tokyonight_day.lua`. That project has the Apache License 2.0. md-view uses the color values only, and no code of the project.

## Configuration

The file is `${XDG_CONFIG_HOME:-$HOME/.config}/md-view/config.ini`. Run `md-view --init-config` to write a sample. Only the section `[View]` is read. A flag beats the file. A value that is not accepted is ignored.

| Key | Values | Default |
|---|---|---|
| `width` | `60`, `70`, `80` | `70` |
| `theme` | `light`, `dark`, `auto` | `auto` |
| `palette` | `github`, `tokyo` | `github` |
| `browser` | `auto`, `firefox`, `chrome`, `safari`, or an absolute path to a program | `auto` |
| `tree` | `on`, `off` | `on` |
| `root` | `dir` is the folder of the file. `repo` is the nearest folder upward with `.git`. | `dir` |
| `tree_depth` | 1 to 12 | `6` |
| `tree_max_files` | 1 to 2000 | `500` |

## Use from far2l

Run `md-view --print-association` from the installed copy. It prints the entry with the absolute path of the launcher. The steps are:

1. In far2l, press F9, open the Commands menu and choose File associations.
2. Press Ins to add an entry.
3. As the file mask, type `*.md`.
4. Tick "View command (used for Alt+F3)". Type the command that `md-view --print-association` printed.
5. Press OK.

Alt-F3 on a Markdown file now opens it in the browser. md-view ships no entry and does not edit the far2l `config.ini`.

## Use from Midnight Commander

Add a rule to your `mc.ext` file. In mc, press F9, open the Command menu and choose Edit extension file. The new format (mc.ext.ini) is:

```ini
[md]
Regex=\\.md$
View=md-view %f
```

The old format is:

```
regex/\.md$
	View=md-view %f
```

F3 on a Markdown file now opens it in the browser. Put the rule before any rule that matches the same files. If mc starts with a short `PATH`, use the absolute path of `md-view`.

## Move from far2l

md-view began as `md-open.sh` in the far2l fork. It does not read the old paths, and it has no fallback. To keep your settings, move the file:

```sh
mkdir -p ~/.config/md-view
mv ~/.config/far2l/settings/md-view.ini ~/.config/md-view/config.ini
```

The old cache folder `~/.cache/far2l/md` is not used. You can delete it. Install md-view and add the far2l entry again with `md-view --print-association`, because the command name changed. The page choice that you saved in the browser (width, theme, tree) is lost once, because md-view uses new key names.

## License

GNU General Public License version 2, the license of far2l, where the script came from. See [LICENSE](LICENSE).

The vendored files keep their own licenses:

| File | Source | License file |
|---|---|---|
| `lib/marked.min.js` | marked | `lib/marked.LICENSE.md` |
| `lib/highlight.min.js`, `lib/hljs-github*.css` | highlight.js | `lib/highlight.LICENSE.md` |
| `lib/github-markdown-*.css` | github-markdown-css | `lib/github-markdown.LICENSE.md` |

The page also loads mermaid from the jsdelivr CDN at run time.
