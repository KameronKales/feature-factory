# Glossary

<sub>[← Docs index](README.md)</sub>

The factory coins a few terms and reuses some Claude Code ones. If a doc uses a word you're unsure of,
it's probably here. Terms are grouped roughly by when you meet them.

## The core idea

- **Gap** — a specific, high-value capability the product is *missing or covers weakly*, confirmed by
  reading/grepping the real codebase (not guessed). The `research-gaps` workflow emits a ranked list of
  these; each gap is a structured object (`{ slug, name, description, audience, evidence,
  recommended_tool, distribution, skill_route, scope, priority }`) that `build-gap` consumes directly.
- **Definition of Done (DoD)** — the fixed checklist *every* gap must satisfy to count as shipped,
  written once in [`FEATURE_PLAYBOOK.md`](FEATURE_PLAYBOOK.md) so success isn't re-invented per feature.
- **The Feature Playbook** — the document that holds the DoD (the finance one ships as the example;
  [`FEATURE_PLAYBOOK.generic.md`](FEATURE_PLAYBOOK.generic.md) is the blank template).

## Runtime & orchestration

- **Claude Code** — the runtime the whole factory runs *inside*. There is no separate server/daemon.
- **Main loop** — Claude Code itself acting as the orchestrator, following
  [`../skills/feature-factory/SKILL.md`](../skills/feature-factory/SKILL.md): arm resilience → research
  → build each gap → **verify locally** → ship → tear down.
- **Workflow** — a deterministic script in `.claude/workflows/*.js` that fans out parallel AI
  **subagents** and returns structured data. The two here are `research-gaps` and `build-gap`.
- **`Workflow` tool** — how the main loop runs a workflow: `Workflow({ name, args })`. So every
  `Workflow({…})` in these docs means *the assistant calling a tool for you* — not a shell command.
- **Subagent** — a fresh Claude instance a workflow spawns to do one scoped task (e.g. audit one
  domain). Many run in parallel; each returns its result to the workflow.
- **Watchdog** — a recurring check the main loop *schedules* (via its scheduler/cron) to detect a
  stalled build, verify the code itself, advance the queue, and back off on rate limits. It's a
  main-loop behavior, **not** a script — there is intentionally no `watchdog.mjs`.
- **Back off** — on a token rate limit, wait and retry next cycle instead of hammering the API.
- **Keep-awake** — `scripts/keep-awake.mjs`, which stops the machine sleeping mid-run (best-effort;
  see [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md)).

## Building a gap

- **Layer** — one of the disjoint slices a gap ships across (the finance example: `engine | mcp | web |
  skill`; the log-analytics example: `query | api | web | cli`). Layers build in dependency order and
  own non-overlapping files so they can run in parallel.
- **Engine / shared layer** — the pure, deterministic, typed core that every other layer depends on.
  Built first.
- **Reference-validated / reference targets** — the engine is correct when it matches *hand-computed*
  scenarios (or recorded "golden" fixtures), not just when tests are green.
- **Coverage gate** — the test-coverage threshold a layer must hit (e.g. 90% branch / 100% function).
- **Self-orchestrating (tool)** — an API/MCP tool that reports its own assumed defaults, suggests the
  next action, and discloses assumptions, so it's usable without external glue.
- **Progressive disclosure** — a UI pattern: reveal a feature's inputs only when relevant, so the
  interface doesn't overwhelm. (A DoD requirement for the web layer in the finance example.)
- **safe-jest** — `scripts/safe-jest.mjs`, the hang-proof test runner used for *all* tests (never bare
  `npx jest`). Exit `124` = a hang, not a failing test.

## Distribution

- **MCP (Model Context Protocol)** — an open standard (<https://modelcontextprotocol.io>) for exposing
  tools/data to AI agents over a simple protocol. The finance example distributes capabilities as MCP
  tools; your product may not use MCP at all.
- **Skill** — a Claude Code capability packaged as a folder (`SKILL.md` + `README.md`) that auto-loads
  by its description. The factory can scaffold and publish these (`new-skill.mjs`).
- **Distribution mode** — how a gap reaches users. Two values in the gap object:
  - **`new-skill`** — mint a new dedicated skill/repo for a distinct, high-intent capability.
  - **`fold-in`** — add the capability to an existing skill/surface (the common case; keeps the
    surface tight).
- **Catalog** — the single public repo that lists all your skills (`sync-skills-catalog.mjs`).

## General engineering terms used here

- **Idempotent** — safe to run repeatedly with the same effect (e.g. `new-skill.mjs` won't clobber an
  existing skill; the watchdog won't double-act on a fire).
- **Dry run** (`--dry-run`) — print exactly what *would* happen and exit, writing/pushing nothing.
