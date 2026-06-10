---
name: feature-factory
version: 1.0.0
description: >-
  Autonomously research product gaps and ship them end-to-end. Invoke when someone says "find
  what's missing and build it", "ship the gaps overnight", "run the feature factory", or wants a
  hands-off research→build→ship loop. Pairs two workflows (research-gaps → build-gap) with a fixed
  Definition of Done, hang-proof tests, keep-awake, crash/rate-limit recovery, and progress updates.
---

# Feature Factory — autonomous research → build → ship

A repeatable, hands-off loop: **discover the highest-value gaps in a product, then build and ship
each one** across engine, tests, UI, API/MCP, and distribution — to a fixed Definition of Done,
with the resilience needed to run unattended (e.g. overnight).

It's two saved workflows plus an orchestration the assistant runs in its main loop. Don't reinvent
it each time — invoke this skill.

## Inputs (all optional)
- **how many** gaps to build this run (default: all that research surfaces, highest-value first)
- **focus** area for research (default: the whole product surface)
- **exclude** already-built/in-flight slugs
- **updates channel** (a chat webhook) for progress — read it from `updatesChannel` in
  `scripts/factory.config.json` (or the `FACTORY_UPDATES_CHANNEL` env var) or your memory; never hardcode
- **distribution mode** — read `distributionMode` from `scripts/factory.config.json` (or
  `FACTORY_DISTRIBUTION_MODE`). **`in-repo`** (the default; nothing is published — features are built
  straight into the user's repo) or **`skills`** (also mint/publish per-skill repos + a public catalog,
  which needs `org` + `catalogRepo`). If unset, treat as `skills` only when a `catalogRepo` is
  configured, else `in-repo`. Most adopters never set `org`/`catalogRepo` and stay `in-repo`.

## Step 0 — Arm resilience (once per run)
1. **Keep-awake:** start `node scripts/keep-awake.mjs 43200` in the background so the machine
   doesn't sleep and pause workflows/schedulers. It's OS-independent (uses `caffeinate` on macOS,
   `SetThreadExecutionState` on Windows, `systemd-inhibit` on Linux; passive heartbeat otherwise).
2. **Hang-proof tests:** ensure `scripts/safe-jest.mjs` exists and that every workflow runs tests
   through it (hard wall-clock timeout + `--forceExit --runInBand`) — **never bare `npx jest`**,
   which can hang and silently block the whole run.
3. **Watchdog:** schedule a recurring check (~every 20 min, off the :00/:30 marks) — concretely, use
   your scheduler (`/schedule` or a cron routine) to re-enter this skill, e.g. a cron like `*/20 * * * *`
   firing "continue the feature-factory run: check the in-flight build, advance the queue". Each fire,
   idempotently: if a build has run too long → suspect a test hang, stop it, **verify the code
   yourself with safe-jest**, and continue; advance the queue; on token rate-limits **back off** and
   retry next cycle (never hammer); flag any blocked prod step and move on; when done, clean up
   (delete the watchdog, stop keep-awake). There is intentionally **no `watchdog.mjs`** — it needs the
   assistant's scheduler + judgment, so it lives here, not in `scripts/`.

## Step 1 — Research the gaps (structured)
Run `Workflow({ name: 'research-gaps', args: { exclude, focus, distributionMode } })`. It returns a
build-ready list:
`{ gaps: [ { slug, name, description, audience, evidence, recommended_tool, distribution, skill_route, scope, priority } ] }`.
In `in-repo` mode each gap's `distribution` will be `none` (built into the repo) — there's no skill or
catalog step. Post the ranked gap list to the updates channel. Track the queue as tasks (one per gap).

## Step 2 — Build each gap (sequential)
Gaps share files, so build **one at a time**, highest priority first. For each:
1. Write + commit its spec from `docs/FEATURE_PLAYBOOK.md` (auto-apply its decisions:
   `distribution`/`scope` from the gap object).
2. Run `Workflow({ name: 'build-gap', args: <the gap object> })` — engine+tests → (MCP ∥ web+homepage)
   → distribution, all tests via safe-jest, to the Playbook's Definition of Done.
3. **Ship** (main loop): read the verify verdicts, run the suites yourself via safe-jest (+ a build if
   the product has one), fix anything flagged, then commit. **Then, by distribution mode:**
   - **`in-repo` (default):** that's it — the feature is committed to the user's repo. Push to the
     working branch (don't merge to the default branch or deploy unless the user asked). **Do not**
     create remote repos, sync a catalog, or run `new-skill`/`sync-*` — those are skills-mode only.
   - **`skills`:** also create/sync the distribution repo(s) + catalog (`new-skill`/`sync-skill`/
     `sync-skills-catalog`), then merge/deploy per the user's wishes.
4. Post a progress update; mark the task done; take the next gap.

## Step 3 — Finish
When the queue is empty (or the budget is spent), post a summary of what shipped (and anything
partial — never mark partial work "done"), then tear down resilience (stop the watchdog + keep-awake).

## Definition of Done (per gap)
Defined once in `docs/FEATURE_PLAYBOOK.md` — **the user's, for their product** (the shipped one is a
finance example; the blank template is `docs/FEATURE_PLAYBOOK.generic.md`). Whatever layers it lists,
every layer must be met and **verified locally** before a gap is "done." The **external distribution**
layer (publishing a skill + catalog) applies **only in `skills` mode** — in `in-repo` mode a gap is
done when it's built, tested green locally, and committed to the user's repo. Never invent layers the
user's Playbook doesn't have (e.g. don't force an MCP tool or a web panel onto a CLI-only product).
No secrets in committed/shared artifacts.

## Guardrails
- **Sequential builds** (shared files) · **safe-jest only** · **back off on rate limits** ·
  **never mark partial work complete** · **surface assumptions, not silent defaults** ·
  **keep secrets (webhooks/tokens) in config/memory**, never in committed or shared files.

## Cross-platform (Windows / macOS / Linux)
The entire factory is **Node.js** — no bash, no `caffeinate`, no `jq`/`rsync`/`perl`. Every helper is a
`.mjs` script (`safe-jest`, `keep-awake`, `new-skill`, `sync-skill`, `sync-skills-catalog`) invoked as
`node scripts/<x>.mjs`. The only external CLIs are `node`, `npm`, `git`, and (for publishing) `gh` — all
install natively on Windows. So a teammate on any OS can run the loop unchanged.

See `.claude/workflows/research-gaps.js`, `.claude/workflows/build-gap.js`, `scripts/safe-jest.mjs`,
`scripts/keep-awake.mjs`, and `docs/FEATURE_PLAYBOOK.md`.
