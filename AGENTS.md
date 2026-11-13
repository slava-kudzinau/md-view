---
description: Rules for people and agents who work on md-view. Build, test, layout, where the docs are, and global policies.
---

# md-view: rules for people and agents

md-view is a POSIX shell tool. It writes one web page from a Markdown file and opens it in a browser. The repo began as a history-keeping extract of the far2l fork. This file is the index for all work on the project.

## Build and test

There is no build step. Run these commands from the repo root.

| Command | Result |
|---|---|
| `make check` | Runs `tests/browser-page.sh`, `tests/browser-links-dom.sh`, `tests/hostile-dom.sh` and `tests/launcher.sh`. It stops at the first failure. |
| `make install PREFIX=$p` | Writes `$p/share/md-view/` (the script and nine vendored files) and `$p/bin/md-view`. Default `PREFIX` is `/usr/local`. |
| `make uninstall PREFIX=$p` | Removes the files that install wrote. |

A test that has no Chrome or no network prints `skip` lines and passes. Read the `skip` lines before you trust a pass. A pass with `skip all` proved only the tests that need no browser.

Use a temporary `PREFIX` to test the install. `PREFIX` must be absolute and must not hold a single quote.

## Where things are

| Path | Holds |
|---|---|
| `lib/md-view` | The script. It reads the vendored files from its own folder (`self_dir`). |
| `lib/*.js`, `lib/*.css`, `lib/*.LICENSE.md` | The nine vendored files and their licenses. |
| `bin/md-view` | The launcher of the checkout. |
| `tests/` | The four tests, `fixtures/` and `browser-page/`. |
| `README.md` | Install, usage, config keys, far2l and Midnight Commander, the move from far2l. |
| `docs/architecture/md-view.spec.md` | The behavior contract. |
| `docs/architecture/md-view.invariants.md` | Rules that always hold. |
| `docs/architecture/decisions/` | ADRs. [ADR-001](docs/architecture/decisions/adr-001-standalone-tool.md) records the standalone tool. |
| `docs/stories/` | One folder for each story, `docs/stories/{story}/`. |
| `docs/.templates/` | The `story.md` and `adr.md` templates. |

Before you open files, get a list of all docs: `grep -r '^description:' docs README.md AGENTS.md`.

## Global policies

**Code**
- Treat the Markdown file, the file name and every config value as untrusted input.
- Do not weaken the `Content-Security-Policy` meta. Do not weaken the mermaid `securityLevel:'strict'`, the SRI hash of the pinned mermaid script, the escape of raw HTML or the block of remote images. Run a change to any of them through the spec and the hostile-input test.
- Start a browser with `exec` from a checked name or an absolute path. Never use `eval` or `sh -c` with a value from a file or a flag.
- Write POSIX `sh` only. Add no new tool or package.
- The files in `lib/` that are not `md-view` are vendored and unmodified. Each has a license file that names its source. After an upgrade, check the file for `</script` and `</style`, and update the license file.
- The license is GNU GPL version 2. Keep the license text of each vendored file.
- Keep the spec, the README and the tests in step when a flag, a path or a key changes.

**Tests**
- If a test must catch a regression, run it against that regression before you trust it.
- Do not remove a `skip` rule to make a run pass.

**Docs**
- Every doc has frontmatter with `description`. A value does not contain `: ` or ` #`, does not end in `:`, and does not start with a backtick or a quote.
- Write in ASD-STE100 Simplified Technical English. Run `check_ste.py` from the `fde-delivery` plugin (`kb/scripts/`) on each page. The rules do not apply to code, commands and quotes.
- Durable docs (`docs/architecture/`) do not link into `docs/stories/`. Name the story in plain text.
- Do not put secrets or personal paths in the repo.
- At close-out, do three checks. If a contract changed, update the spec. If a choice outlives the story, write an ADR. If you learned a rule, add it to the invariants.

**Git and delivery**
- Do story work with the `fde-delivery:deliver-story` skill. Story folders go in `docs/stories/{story}/`.
- Name each branch `{type}/{slug}`. The type is `feat`, `fix`, `refactor`, `test`, `doc` or `chore`.
- Work on each story in its own git worktree, `.worktrees/{story}`, on the story branch. Make it with `git worktree add .worktrees/{story} -b {type}/{slug}`. Do not edit files in the main checkout during a story. Git ignores `.worktrees/` and `.build/` (the build workspace).
- Do not push, merge or tag if the owner did not ask.
