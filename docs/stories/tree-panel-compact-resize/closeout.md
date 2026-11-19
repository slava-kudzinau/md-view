---
description: The close-out draft of tree-panel-compact-resize: result, build decisions, minor findings left open, and the Run it screenshots.
---

# Close-out: tree-panel-compact-resize

Result: the tree panel has depth rails, a rotating chevron, bold single-line folder rows with ellipsis, one row per single-child folder chain (`deep › a`, joined by `md-sep` spans), a 300 px start width with a draggable, keyable grip (Arrow keys step 16 px, Shift 64 px, double-click resets), and the saved key `md-view-tree-w` (clamp 200..560 px and half the window). Check: `make check` exit 0, 217 ok, no skip lines. The main session reruns it.

Commits: `2c4592e` T1 rails, chevron, ellipsis, grip markup, geometry. `47d25bb` T2 chain rows. `39ac828` T3 resize + storage, `58a6314` T3 test-run fix. `f1e33ee` T4 durable docs. This commit T5 integration proof. Range: `7712ffc..HEAD`.

## What was built

Same as the plan, no more, no less. The pinned CSS rules, the nav line and the keydown-listener count stayed byte-for-byte; the grip keys use a `treeResize.onkeydown` element assignment.

## Decisions made in the build

1. The chain fixture files are the `deep/...` set (T2 review ruling). The plan's `dom/a/d.md` paths never existed in the repo.
2. The `overflow-wrap` grep move was a no-op: no test pins `overflow-wrap` (T3 ruling). `.md-root` keeps its `overflow-wrap: anywhere` safety net.
3. The tests-browser-links run loop was rewritten in one line to restore the three replaced panel cases (T3 fix commit `58a6314`).

## What the reviews caught

- T3 Critical: the run loop replaced three pre-existing cases; fixed in `58a6314`.
- T1, T2, T4 reviews were clean.

## Run it

From the repo root run `bin/md-view README.md --palette github` (or `--palette tokyo`). The panel lists the repo tree: rails per level, chevrons, `docs › architecture`-style chain rows, ellipsized names. Drag the grip on the panel's right edge, focus it and press `->` and `Shift+->`, double-click to reset to 300 px, reload to see the saved width.

The screenshots below came from a deep fixture built like the mock's tree (root files, `docs/architecture/decisions`, `src/components/forms/fields`, `tests/fixtures/deep/deeper/deepest`), rendered by headless Chrome at 1280x800 with the current `lib/md-view`. The "drag" pages run a synthetic `pointerdown`/`pointermove`(+60px)/`pointerup` on `#md-tree-resize` before the shot; the "keys" pages run one synthetic Shift+ArrowRight keydown on the grip.

```sh
CHROME='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
# build the fixture pages (a fresh project folder with the tree above)
sh lib/md-view --no-open --out /tmp/t5/page-github.html --palette github <fixture>.md
sh lib/md-view --no-open --out /tmp/t5/page-tokyo.html --palette tokyo <fixture>.md
# shot at default width
"$CHROME" --headless=new --disable-gpu --no-first-run --use-mock-keychain \
  --password-store=basic --window-size=1280,800 --user-data-dir=/tmp/t5/prof \
  --virtual-time-budget=3000 --screenshot=shots/github-default.png file:///tmp/t5/page-github.html
# drag and keys: append, before </body>, a script that dispatches
#   pointerdown{clientX:297} pointermove{clientX:357} pointerup  (drag, 300 -> 360)
#   keydown{key:'ArrowRight', shiftKey:true}                     (keys, 300 -> 364)
# then run the same Chrome line on the injected page.
```

The state at shot time, read from `--dump-dom` of the same pages: the default pages carry `--md-panel-w: 300px`, the drag pages `--md-panel-w: 360px` with `aria-valuenow="360"`, the keys pages `--md-panel-w: 364px`.

| Shot | Palette | State | File |
|---|---|---|---|
| Default | github | 300 px, one `fields` chain row open | `shots/github-default.png` |
| After one drag (+60 px) | github | 360 px | `shots/github-drag.png` |
| After Shift+ArrowRight | github | 364 px | `shots/github-keys.png` |
| Default | tokyo | 300 px | `shots/tokyo-default.png` |
| After one drag (+60 px) | tokyo | 360 px | `shots/tokyo-drag.png` |
| After Shift+ArrowRight | tokyo | 364 px | `shots/tokyo-keys.png` |
