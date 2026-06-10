# Safety, cost & expectations

<sub>[← Docs index](README.md) · [Troubleshooting](TROUBLESHOOTING.md) · [Glossary](GLOSSARY.md)</sub>

**Read this before your first real (code-writing) run.** The factory is designed to run *unattended*
and to take *irreversible* actions (commit, push, create repos, merge, deploy) without pausing for you.
That's powerful and genuinely useful — but only if you've set expectations and bounded the blast
radius first. The quickstart's research-only run writes nothing; everything below is about the build/ship runs.

## What it does without asking

During an unattended run the main loop will, per the Playbook, **on its own**:
- write files and **commit** them,
- run tests/build/lint locally (the verify gate),
- **create remote repos, push, merge, and deploy** distribution artifacts.

There is **no built-in human-in-the-loop checkpoint between "built" and "shipped"** — the gate is
*green tests*, not *your sign-off*. If you want a sign-off gate, add one (below).

## Cost

Each `research-gaps` or `build-gap` run **fans out many parallel AI subagents** and can run for a long
time (keep-awake defaults to **12 hours**). That is real API/token spend, and a multi-gap overnight run
can be substantial. Before a big run:
- Start with **one gap** (`how many gaps = 1`) or a **research-only** pass to size the cost.
- Watch the live progress (`/workflows`) and stop early if it's not converging.
- Remember the token pool is shared across the main loop and every subagent.

## Bound the blast radius (recommended)

- **Run on a throwaway branch**, not `main`: `git switch -c factory/run-$(date +%s)` first. Review the
  diff before merging anything.
- **Cap the scope**: build one gap at a time; exclude areas you don't want touched.
- **Point distribution at a staging/test org** in `factory.config.json` until you trust the output.
- **Require review before merge**: branch protection on `main` (or simply: let it build + commit on a
  branch, but *you* open and merge the PR) turns the "no checkpoint" default into a checkpoint.
- **Keep secrets out of the repo**: webhooks/tokens belong in `factory.config.json` (gitignored) or env.

## How to stop a run

- **Stop the keep-awake** you backgrounded: find it (`pgrep -f keep-awake` / Task Manager) and kill it,
  or just let its window elapse. It does nothing but hold the machine awake.
- **Interrupt the assistant** (Esc / new instruction) — the main loop is just Claude Code; tell it to
  stop, and it stops between steps.
- **Stop a workflow** mid-run via `/workflows` (or the TaskStop control). Workflows are **resumable** —
  see [TROUBLESHOOTING.md](TROUBLESHOOTING.md#resuming-an-interrupted-run).
- **Delete the watchdog** (the scheduled re-check) so it doesn't re-trigger work after you've stopped.

## What the AI can get wrong (limitations)

The verify gate proves tests are **green** — not that the code is **correct**. An autonomous
code-writer can produce output that passes and is still wrong. Treat its work like a fast junior
engineer's: useful, but reviewed. Specifically watch for:

- **Plausible-but-wrong logic** — an engine that hits a *reference target you also let it choose*. Pin
  hand-computed reference scenarios yourself for anything decision-grade.
- **Tests written to pass, not to validate** — a suite that asserts the implementation back to itself.
  Skim the tests, not just the green checkmark.
- **Semantic "done" that's incomplete** — a layer that compiles and renders but misses an edge case the
  spec implied. The DoD is a floor, not a guarantee.
- **Security/quality regressions** — new input paths, auth, or data handling that no test exercises.
- **Over-confident summaries** — "shipped" should mean *you saw the diff and the gate*, not that a
  subagent said so. (The factory already mandates the main loop verify locally and never trust a
  subagent's word — this is the human extension of that rule.)

**Bottom line: review the diff before it merges.** The factory gets you a tested, end-to-end draft far
faster than by hand; the last mile of judgment is still yours.
