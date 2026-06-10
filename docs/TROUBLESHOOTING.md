# Troubleshooting & failure recovery

<sub>[← Docs index](README.md) · [Safety & cost](SAFETY.md) · [Glossary](GLOSSARY.md)</sub>

The factory is built to run unattended, so most failures are designed to be *recoverable* rather than
fatal. This is the symptom → cause → fix reference for **mechanical** failures (hangs, sleep, rate limits,
config). For the *other* category — code that's green but **semantically wrong** — and for cost / how
to stop or bound a run, see [`SAFETY.md`](SAFETY.md). An unattended run is only as good as its failure
modes.

## Quick reference

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Test output ends with `::SAFE_JEST_TIMEOUT::` and exit code **124** | A test **hung** (open handle, deadlock) — `safe-jest` killed the process tree at the wall clock. This is **not** a red test. | Re-scope to the specific suite/file; raise the budget with `SAFE_JEST_WALL=600`; investigate the hanging test. Don't treat 124 as a failing assertion. |
| A build step "runs forever" | A bare `npx jest` somewhere (can hang on open handles) | Route **all** tests through `node scripts/safe-jest.mjs …` — never bare jest. That's the whole point of the wrapper. |
| `safe-jest --worker` errors that the dir isn't found | The `--worker` second test root defaults to the finance example's `workers/ai-mcp` | Set `SAFE_JEST_WORKER_DIR` (+ `SAFE_JEST_WORKER_CONFIG`) to your second root, or drop `--worker` if you have one test root. `node scripts/safe-jest.mjs --help`. |
| Run pauses for a long time, little progress | **Token rate limit** | The main loop should **back off** and retry next cycle — not hammer. If you're driving manually, wait for the limit window to reset, then resume. Don't spawn more parallel agents. |
| Machine went to sleep mid-run; workflows stalled | `keep-awake` fell back to a **passive heartbeat** (no native inhibitor found) | The passive heartbeat keeps the API uniform but does **not** force-prevent sleep. Adjust OS power settings, or ensure `caffeinate` (macOS) / `systemd-inhibit` (Linux) / PowerShell (Windows) is available. `keep-awake` prints a warning when it degrades. |
| A workflow erred out partway | A subagent died, a schema validation failed, or a terminal API error | Workflows are **resumable** — see [Resuming an interrupted run](#resuming-an-interrupted-run). Fix the cause, then resume from the run ID; completed agents return cached results. |
| `feature-factory config: "org" is required …` thrown | A sync/publish script ran without `org`/`catalogRepo` set | Expected — there are no default push targets. `cp scripts/factory.config.example.json scripts/factory.config.json` and fill `org` + `catalogRepo`, or pass `FACTORY_ORG` / `FACTORY_CATALOG_REPO`. Research/build runs don't need this. |
| `--publish` fails immediately | `gh` missing or not authed | `gh auth login` first; `--publish` needs the GitHub CLI. Or set `SKILL_SYNC_TOKEN` for token-based push. |
| Gap looks "done" but a layer is missing | A subagent reported success the main loop didn't verify | **Never ship on a subagent's word.** The main loop must re-run the suites + build + lint locally itself before shipping (the non-negotiable pre-ship gate). A partial gap is partial — say so. |

## safe-jest exit codes

`safe-jest` makes a hang distinguishable from a failure — that distinction drives recovery:

- **0** — all tests passed.
- **non-zero (not 124)** — jest's own exit code: a **real test failure**. Read the output, fix the code.
- **124** — the wall-clock timeout fired and `safe-jest` killed the tree (you'll see
  `::SAFE_JEST_TIMEOUT:: exceeded <N>s`). This is a **HANG**, not a failing assertion — re-scope or
  investigate the stuck test; do not "fix" it as if an assertion failed.

Tune the wall clock per invocation: `SAFE_JEST_WALL=600 node scripts/safe-jest.mjs <paths>`.

## Resuming an interrupted run

If a workflow is killed, crashes, or you stop it (e.g. to edit the script), you don't start over:

- **Same session:** re-invoke with the run's ID — `Workflow({ scriptPath, resumeFromRunId: '<runId>' })`.
  Every completed `agent()` call with an unchanged prompt returns its cached result instantly; only the
  first edited/new call and everything after it re-runs. Same script + same args → 100% cache hit.
- **The main loop's own resilience:** the watchdog (scheduled by the `feature-factory` skill) detects a
  stalled build on each fire, verifies the code itself with `safe-jest`, advances the queue, backs off
  on rate limits, and cleans up when done. It's a main-loop behavior, not a script — see
  `skills/feature-factory/SKILL.md`.

## When in doubt

- Re-run the gate manually: `npm run check && npm test` (the harness's own health check).
- Scope tests narrowly: `node scripts/safe-jest.mjs path/to/one.test.ts` beats running everything.
- Don't mark partial work done. Report exactly which step failed or was skipped.
