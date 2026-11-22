# Gate: md-view-script-hygiene

_For the owner, who reads this instead of the code. One page per section. The model writes "Before build" before any task starts, and "At merge" at close-out; both go at the top of the PR._

## Before build

### What it builds

`lib/md-view` gains one shared file:// escape function, one single-pass head check, and a source-only mode for testing. The page it writes does not change, byte for byte. A new unit-test file checks the pure shell helpers directly.

### Parts it touches

```mermaid
flowchart LR
  md[lib/md-view] -->|url_escape (new, shared)| esc[sed + awk recipe]
  md -->|head_has_all (new)| awk[one sed + one awk pass]
  md -->|MD_VIEW_SOURCE_ONLY guard| flow[executable flow, skipped when sourcing]
  unit[tests/unit-helpers.sh] -->|MD_VIEW_SOURCE_ONLY=1| md
  mk[Makefile / AGENTS.md] -->|fifth test| unit
  pages[tests/browser-page.sh, tests/hostile-dom.sh] -->|pin page bytes, must pass unchanged| md
```

### Contracts, data and runtime

None new. The head lines (`<base href>`, the key meta, the ini state line, the tree state comment) keep their exact bytes. No flag, key, format or config value changes. No spec change beyond the owner-approved md-view.spec.md `make check` line (four tests to five tests, owner 2026-11-22). No README, ADR or invariants change.

### Decisions the model made

| Decision | Alternative rejected | Why |
|---|---|---|
| The duplicated sed + awk recipe moves into one `url_escape` function; `file_url` and `base_url` call it | Route both through `enc_path` | `enc_path` encodes every byte outside `A-Za-z0-9._~/-`; the sed recipe leaves bytes like `[` or non-ASCII literal. Unifying on `enc_path` would change the `<base href>` bytes. Byte-identical is the hard constraint |
| `head_has_all LINE...` transports the wanted lines via `ENVIRON` (one `awk` pass over a `sed` head) | Temp file + `awk` file; or one `grep` per line | No extra processes and no cleanup path. `ENVIRON` passes raw bytes safely, and the four lines (key, ini, base, tree) hold no newlines |
| The singular `head_has` is deleted, not wrapped | Keep a `head_has` wrapper for callers | The three call sites all move to `head_has_all`. A wrapper with no caller is dead code |
| Unit tests source `lib/md-view` with `MD_VIEW_SOURCE_ONLY=1` | Extract helpers into a new `lib/helpers.sh` sourced by both | That adds an eleventh file to the install and to ADR-001's one-script shape. The guard keeps the single-file install |
| `tests/unit-helpers.sh` is the fifth `make check` target, after `launcher.sh` | A separate `make unit` target | AGENTS.md names one check command; a unit suite outside it would not run in the gate |
| Risk flag `contract` from the brief stands; the story is built at the full tier | Downgrade to `none` at Orient | The deliver-story rule forbids removing a story's risk flags. The flag forces the stop you are reading |
| Four tasks, sequential T1 to T4, one commit each | Parallel implementers in one file | T1 and T2 edit `lib/md-view`; T3 wraps the flow; T4 depends on all three. Parallel runs in one file conflict |
| Unit tests cover the new `url_escape` and `head_has_all` helpers beyond the story's fixed list | Drop them to match the letter of the brief | They test code this story adds; the verifier asked for visibility, not removal |
| `docs/architecture/md-view.spec.md` becomes "five tests" (owner-approved one line, 2026-11-22) | Leave the durable spec stale | AGENTS.md requires the spec and the tests in step; the owner broke the tie |

### How you'll see it working

`make check` in `.worktrees/md-view-script-hygiene` (five tests pass, the last is `tests/unit-helpers.sh`). Then: `MD_VIEW_SOURCE_ONLY=1 sh lib/md-view </dev/null; echo $?` prints `0` and writes nothing. Byte-identical proof: write a page for a fixture whose parent path has spaces, `%`, `#` and a trailing newline. Do this at `origin/main` and on the branch; `cmp` must be clean.

### A fresh reader's paraphrase

The story adds three things to `lib/md-view`: a shared `file://` escape function (one sed + awk recipe used by both `file_url` and `base_url`), a single-pass `head_has_all` check that verifies all wanted page-head lines in one go, and a source-only mode (`MD_VIEW_SOURCE_ONLY=1`) so tests can source the script without running it. The generated page does not change at all — byte-identical output is the hard constraint, so the existing duplicated recipe and the singular `head_has` are consolidated/deleted rather than re-encoded. A new unit-test file (`tests/unit-helpers.sh`) tests the pure shell helpers directly, and the Makefile/AGENTS.md gain it as a fifth `make check` test.

`lib/md-view` exposes `url_escape` (shared by `file_url` and `base_url`) and `head_has_all` (one sed + one awk pass, wanted lines transported via `ENVIRON`). The test file sources `lib/md-view` with `MD_VIEW_SOURCE_ONLY=1`. The executable flow exits early, so only the function definitions are loaded. The Makefile / AGENTS.md register `tests/unit-helpers.sh` as the fifth check. The existing browser-page and hostile-DOM tests pin the page bytes and must pass unchanged. No new contracts, formats, flags or config values are introduced.

_Terms: `MD_VIEW_SOURCE_ONLY` gates the executable flow so sourcing loads helpers only. ADR-001 is the stand-alone POSIX sh tool decision. The rest are code symbols pinned in `plan.md` and `spec.md`._

## At merge

### What was built

### Decisions changed during the build

### What the reviews caught

### Run it
