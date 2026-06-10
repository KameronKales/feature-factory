# The Feature Factory — how it works

A hands-off loop that **discovers the highest-value gaps in the product, then builds and ships each
one** end-to-end — engine, tests, UI, API/MCP, and distribution — to a fixed Definition of Done. It's
designed to run unattended (e.g. overnight) and recover from the usual things that derail long runs.

It's **100% Node.js** — no bash, no OS-specific tools. Clone it and run it on **Windows, macOS, or
Linux** with the same commands. The only external CLIs are `node`, `npm`, `git`, and `gh` (for
publishing), all of which install natively on every OS.

---

## The 30-second mental model

```
  research-gaps  ─►  ranked list of gaps  ─►  for each gap:  build-gap  ─►  verify locally  ─►  ship
   (1 workflow)        {slug, tool, …}                       (1 workflow)    (main loop)        (git/gh)
```

Two saved **workflows** do the heavy lifting (each fans out parallel AI subagents); the **main loop**
(the assistant) orchestrates them, verifies the result on the local machine, and ships. A small set of
**Node helper scripts** provide hang-proof tests + keep-awake + the mechanical git/test plumbing
(the watchdog/backoff/recovery are main-loop *behaviors*, not scripts — see "What makes it run unattended").

---

## Components

### 1. Workflows (`.claude/workflows/`)
- **`research-gaps.js`** — **product-neutral**: fans out one auditor per domain (the domains, focus, repo
  root, and where-to-look surface all come from `args` — nothing is baked in), each discovering the
  project's own capabilities and grepping the real codebase to confirm what's actually missing (not
  guessed). A ranking pass dedupes, drops false positives, excludes already-built work, and emits a
  **build-ready list**: `{ slug, name, description, audience, evidence, recommended_tool, distribution, skill_route, scope, priority }`.
  Invoke for any project:
  ```
  Workflow({ name: 'research-gaps', args: {
    root: '/abs/path/to/your/repo',
    domains: ['onboarding', 'billing', 'reliability', ...],
    focus: 'what your product is really for',
    surface: 'its REST API + CLI',   // or 'its MCP tool registry', etc.
  } })
  ```
  Worked example (a personal-finance product): pass `domains: ['accumulation & FIRE', 'taxes',
  'decumulation', 'real estate', 'debt & cashflow', 'equity comp', 'protection/estate', 'guaranteed
  income', 'fixed income', 'relocation', ...]` and `surface: 'its MCP tool registry + engine modules'`.
- **`build-gap.js`** — a **customize-per-project template** (worked example: a finance web-app + MCP
  product). Unlike research-gaps it intentionally encodes a concrete architecture — a four-layer
  `engine|mcp|web|skill` model with specific paths and a product-shaped Definition of Done. Keep the
  spine (**Investigate** → **Synthesize** → **Implement** → **Verify**, all tests via `safe-jest`) and
  **replace the layer keys / file groups / exemplar components / DoD checks with your own** (and point
  `docs/FEATURE_PLAYBOOK.md` at your DoD). This is the one file you adapt to your stack.

### 2. The Definition of Done (`docs/FEATURE_PLAYBOOK.md`)
The single source of truth for "what done looks like," so success isn't re-invented per feature. Every
gap must ship: a pure reusable **engine** (+ reference-validated tests to the coverage gate), **web**
integration (progressive-disclosure input + dedicated results panel + wired into the forecast + a
homepage feature-list update + an e2e smoke), a self-orchestrating **MCP** tool, and **distribution** (a
skill in its repo + the catalog, or folded into an existing skill). Plus a **non-negotiable pre-ship
local-verification gate**: the main loop must itself re-run the suites + build + lint green locally
before any remote/deploy step — subagent verdicts are advisory only.

### 3. The orchestration skill (`skills/feature-factory/`)
`SKILL.md` is the playbook the assistant follows when you say **"run the feature factory"**: arm
resilience → research → build each gap sequentially (they share files) → verify locally → ship → post
progress → tear down. `README.md` is the human-facing overview.

### 4. Node helper scripts (`scripts/`) — all OS-independent
| Script | Replaces | What it does |
|--------|----------|--------------|
| `safe-jest.mjs` | bash + `timeout`/`perl` | Hang-proof test runner: hard wall-clock timeout (kills the process tree), `--forceExit --runInBand`. Distinguishes a real failure from a hang. **Always use this, never bare `npx jest`.** |
| `keep-awake.mjs` | macOS `caffeinate` | Stops the machine sleeping mid-run. Uses `caffeinate` (macOS), `SetThreadExecutionState` (Windows), `systemd-inhibit` (Linux), or a passive heartbeat. |
| `new-skill.mjs` | bash + `jq`/`sed` | Scaffolds a new skill from `templates/skill/`, registers it in the marketplace, optionally creates + syncs its public repo. |
| `sync-skill.mjs` | bash + `rsync`/`jq`/`awk` | Mirrors one skill to its public distribution repo. |
| `sync-skills-catalog.mjs` | bash + `rsync`/`jq`/`perl` | Mirrors all skills + a generated catalog README to the public catalog repo. |

### 5. CI (`.github/workflows/ci.yml`)
This repo ships one workflow — `ci.yml` — which is the factory's **own** pre-ship gate: on every
push/PR it parse-checks every harness script (`npm run check`) and runs the test suite (`npm test`),
holding the factory to the same "automated gate before shipping" rule it mandates for the products it
builds. (In a real product repo you'd typically add a sync workflow that invokes `sync-skill.mjs` /
`sync-skills-catalog.mjs` to mirror skills to their public repos on every change — because those are
`.mjs` scripts, the same command runs identically locally and in CI.)

---

## Running it

```
"run the feature factory"          # or the /feature-factory skill
```
Optional inputs: how many gaps to build, a focus area, slugs to exclude, an updates channel.

What happens:
1. **Arm resilience** — `node scripts/keep-awake.mjs 43200` in the background; confirm `safe-jest.mjs`
   is wired into every test step; (optionally) schedule a watchdog.
2. **Research** — run `research-gaps`; post the ranked queue.
3. **Build each gap** (sequential, highest priority first) — run `build-gap`, then **the main loop
   re-runs the suites + build + lint locally** and fixes anything flagged.
4. **Ship** — create/sync the distribution repo(s) + catalog, merge, deploy.
5. **Finish** — post a summary; tear down resilience. Partial work is never marked "done."

---

## What makes it run unattended

Two kinds of resilience — **don't confuse them**:

**Node scripts (real, runnable code):**
- **Hang-proof tests** (`safe-jest.mjs`) — a stuck test can't silently block the run forever.
- **Keep-awake** (`keep-awake.mjs`) — the machine won't sleep and pause workflows.

**Assistant behaviors (model-judgment, driven by the `feature-factory` skill — NOT scripts):**
- **Self-healing watchdog** — the assistant schedules a recurring check (via its scheduler/cron),
  and on each fire detects a stalled build, verifies the code itself with safe-jest, **backs off on
  token rate limits** instead of hammering, flags anything it can't safely do, and cleans up.
- **Crash/rate-limit recovery + sequential, shared-file builds** — also main-loop behaviors.

There is intentionally **no `watchdog.mjs`**: the watchdog needs the assistant's scheduler + judgment,
so it lives in `skills/feature-factory/SKILL.md`, not in `scripts/`.

- **A real Definition of Done** — every feature ships the same way; no half-features.

## Adapting it to another product
The harness is generic; the product-specific parts live in files you own:
`research-gaps.js` (how gaps are discovered/ranked — usually no edits, all domain detail comes from
`args`), `build-gap.js` (the build phases + your layer model), `FEATURE_PLAYBOOK.md` (your DoD). Swap
those; the resilience + orchestration + cross-platform scripts stay.

**Full walkthrough:** [`docs/ADAPTING.md`](ADAPTING.md) — the 3-step adaptation with a worked
non-finance example (a log-analytics SaaS), a domain-neutral build-gap starting point at
[`docs/build-gap.generic.js`](build-gap.generic.js), and a filled example spec at
[`docs/specs/EXAMPLE.md`](specs/EXAMPLE.md).

---

## Cross-platform requirements
Install `node` (≥ 18), `npm`, `git`, and — only if publishing skills — the GitHub CLI `gh`. That's it.
Everything else is Node scripts run as `node scripts/<x>.mjs`. No WSL, no Git Bash, no Cygwin needed.
