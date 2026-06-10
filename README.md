# Feature Factory

A hands-off, **project-agnostic** loop that discovers the highest-value gaps in a product, then builds
and ships each one end-to-end (engine → tests → UI → API/MCP → distribution) to a fixed Definition of
Done — designed to run unattended and recover from the usual things that derail long runs.

(MCP = [Model Context Protocol](https://modelcontextprotocol.io); new to the terms here? see the
[glossary](docs/GLOSSARY.md).)

**100% Node.js.** Runs identically on Windows, macOS, and Linux. The only external CLIs are `node`,
`npm`, `git`, and `gh` (for publishing) — all install natively on every OS.

## Why this exists

Every product has a pile of useful features that never get built. The work isn't hard, it's just
repetitive: figure out what's missing, build it, test it, hook up the UI and API, document it, ship it.
Doing that by hand is slow, so the pile grows. Handing it to an AI one prompt at a time doesn't help
much — you end up babysitting it.

Feature Factory runs the whole cycle and checks its own work. Point it at a repo and it finds the gaps
worth building by reading your actual code, then builds each one to the same finish line: engine,
tests, UI, API, distribution. Before it ships anything it reruns the tests and build itself — a passing
report from a sub-agent doesn't count.

It's built to run unattended without going sideways: a stuck test can't hang the run, it backs off when
it hits rate limits, and it works on a branch so you see the diff before it merges. And it won't claim
its code is right just because the tests pass — it tells you what it's unsure about.

## How it works (at a glance)

```
            you: "run the feature factory"
                          │
                          ▼
 ┌───────────────────────────────────────────────────────────────────────┐
 │  MAIN LOOP   — Claude Code, following skills/feature-factory/SKILL.md    │
 │  orchestrates the run · verifies results locally · ships · self-heals    │
 └──┬──────────────────────────────────────────────────────────┬──────────┘
    │ 1. research                                                │ 2. build each gap
    ▼                                                            ▼
 ┌─────────────────────────┐   ranked gap list   ┌──────────────────────────┐
 │  research-gaps           │  ────────────────►  │  build-gap                │
 │  (workflow)              │  {slug, priority,   │  (workflow, per gap)      │
 │  fans out AI auditors,   │   evidence, … }     │  engine → tests → UI →    │
 │  greps YOUR codebase     │                     │  API/MCP → distribution   │
 │  → finds real gaps       │                     │  (parallel subagents)     │
 └─────────────────────────┘                     └─────────────┬────────────┘
   product-agnostic                                            │ 3. verify LOCALLY
   (no domain baked in)                                        ▼
                                                  ┌──────────────────────────┐
                                                  │  pre-ship gate            │
                                                  │  tests + build + lint     │
                                                  │  run by the MAIN LOOP     │
                                                  │  (never a subagent's word)│
                                                  └─────────────┬────────────┘
                                                                │ 4. ship
                                                                ▼
                                                   commit · push · publish
                                                   skill + catalog / deploy
                                                   (loop to the next gap)

 Supporting cast — what's what:
   docs/FEATURE_PLAYBOOK.md     the Definition of Done every gap ships to   (you customize)
   scripts/safe-jest.mjs        hang-proof test runner — a stuck test can't block the run
   scripts/keep-awake.mjs       stops the machine sleeping during a long run
   watchdog                     a MAIN-LOOP behavior (not a script): re-checks a stalled
                                run, backs off on rate limits, cleans up when done
   scripts/factory.config.json  your project identity (org, catalog repo) — gitignored
```

**The two workflows do the heavy lifting; the main loop (Claude Code) drives them, checks the work on
your machine, and ships.** `research-gaps` is product-neutral; `build-gap` + the Playbook are the parts
you adapt to your stack. Full architecture: [`docs/FEATURE_FACTORY.md`](docs/FEATURE_FACTORY.md).

**New here?** Start with [`docs/QUICKSTART.md`](docs/QUICKSTART.md) (clone → verify → a real
research-only first run in ~10 min), then read in order: [`docs/FEATURE_FACTORY.md`](docs/FEATURE_FACTORY.md)
(how it works) → [`docs/ADAPTING.md`](docs/ADAPTING.md) (point it at *your* product, with a
[worked non-finance example](docs/examples/log-analytics/)) → [`docs/FEATURE_PLAYBOOK.md`](docs/FEATURE_PLAYBOOK.md)
(the Definition of Done). Before a real (code-writing) run: [`docs/SAFETY.md`](docs/SAFETY.md) (cost, what runs unsupervised, how
to bound/stop it, and what the AI can get wrong). When a run misbehaves:
[`docs/TROUBLESHOOTING.md`](docs/TROUBLESHOOTING.md). Want to contribute to the harness itself?
[`CONTRIBUTING.md`](CONTRIBUTING.md). New to the terminology? [`docs/GLOSSARY.md`](docs/GLOSSARY.md).

---

## Setup (any project)

> Easiest path: **clone this repo as your starting point** rather than copying files piecemeal — then
> the test/CI gate and `npm run` commands work out of the box. If you're folding it into an existing
> repo, copy the full set below.

1. **Copy these files into your repo:**
   - `scripts/*.mjs` — the reusable harness + distribution scripts
   - `scripts/catalog-readme.template.md` — your catalog page (edit the prose)
   - `.claude/workflows/*.js` — the research + build workflows (customize for your domain)
   - `docs/FEATURE_PLAYBOOK.md` (+ the rest of `docs/`) — your Definition of Done (customize)
   - `skills/feature-factory/` — the orchestration the assistant follows
   - `.claude-plugin/marketplace.json` — the skill registry (so `/plugin install` works)
   - `templates/skill/` — the template `new-skill.mjs` scaffolds from
   - `package.json` — what the `npm run check` / `npm test` / `npm run new:skill` commands resolve to
   - `.github/workflows/ci.yml` — the pre-ship gate (parse-check + tests on every push/PR)
   - `LICENSE` — MIT

2. **Make the `feature-factory` skill discoverable.** Claude Code loads skills from
   `~/.claude/skills/` (every project) or `.claude/skills/` (this project). If you cloned the repo you
   can also install via the marketplace: `/plugin marketplace add <path-or-repo>` then
   `/plugin install feature-factory`. **Restart Claude Code (or start a new session)** so the skill
   loads by its description.

3. **Verify the harness is healthy:**
   ```
   npm run check    # parse-checks every helper script
   npm test         # runs the harness test suite
   ```

4. **Configure** (only needed to *publish* skills) — copy the example and fill in YOUR values:
   ```
   cp scripts/factory.config.example.json scripts/factory.config.json
   ```
   There are **no built-in defaults for push targets** (org, catalog repo). The sync/publish scripts
   **refuse to run** until you set `org` + `catalogRepo` — so a clone can never accidentally push to
   someone else's repos. (You can also set everything via `FACTORY_*` env vars instead of the file.)

5. **Run** — in Claude Code, say *"run the feature factory"* (or invoke the `feature-factory` skill).
   See [`docs/QUICKSTART.md`](docs/QUICKSTART.md) for a guided, build-nothing first run.

## The scripts

Run any of them with `--help` for usage. The `bin`/`npm run` aliases are in parentheses.

| Script (alias) | What it does |
|----------------|--------------|
| `scripts/safe-jest.mjs` | Hang-proof test runner (hard timeout kills the process tree). Use instead of bare `npx jest`. |
| `scripts/keep-awake.mjs` | OS-independent keep-awake for long runs (caffeinate / Windows / systemd / heartbeat). |
| `scripts/new-skill.mjs` (`npm run new:skill`, bin `factory-new-skill`) | Scaffold a new skill + register it in the marketplace + optional publish. |
| `scripts/sync-skill.mjs` (`npm run sync:skill`, bin `factory-sync-skill`) | Mirror one skill to its public repo. |
| `scripts/sync-skills-catalog.mjs` (`npm run sync:catalog`, bin `factory-sync-catalog`) | Mirror all skills + a generated catalog README to the catalog repo. |
| `scripts/factory.config.mjs` | Reads `factory.config.json` / env; the single source of project identity. |

Repo health checks: `npm run check` (parse-check every script) and `npm test` (the harness test suite).

## Configuration keys

| JSON key | Env var | Required? | Meaning |
|----------|---------|-----------|---------|
| `org` | `FACTORY_ORG` | **yes** | GitHub org/user that owns the per-skill repos |
| `catalogRepo` | `FACTORY_CATALOG_REPO` | **yes** | The single public catalog repo (`owner/name`) |
| `skillRepoPrefix` | `FACTORY_SKILL_REPO_PREFIX` | no (default `""`) | Prefix for per-skill repo names |
| `monorepo` | `FACTORY_MONOREPO` | no | Source-of-truth repo slug (shown in generated docs) |
| `productName` | `FACTORY_PRODUCT_NAME` | no | Display name in generated READMEs |
| `mcpUrl` | `FACTORY_MCP_URL` | no | Your public MCP server URL |
| `authorName` | `FACTORY_AUTHOR_NAME` | no (defaults to `org`) | Author name written into scaffolded skill metadata |
| `authorUrl` | `FACTORY_AUTHOR_URL` | no (defaults to `github.com/<org>`) | Author URL written into scaffolded skill metadata |
| `defaultDesc` | `FACTORY_DEFAULT_DESC` | no | Override the auto-generated one-line skill description |
| `gitName` / `gitEmail` | `SYNC_GIT_NAME` / `SYNC_GIT_EMAIL` | no | Commit identity for sync pushes |
| `updatesChannel` | `FACTORY_UPDATES_CHANNEL` | no | Chat webhook the run posts progress to (the assistant reads it; never hardcode it) |
| `safeJestWorkerDir` | `SAFE_JEST_WORKER_DIR` | no (default `workers/ai-mcp`) | Second test root for `safe-jest --worker` — point at your own monorepo path |
| `safeJestWorkerConfig` | `SAFE_JEST_WORKER_CONFIG` | no (default `jest.config.cjs`) | Jest config inside that dir (`""` = jest's default) |
| `legacyRepos` | `FACTORY_LEGACY_REPOS` | no | Map of skills whose repo name differs from the convention |

`scripts/factory.config.json` is **gitignored** — your project identity never travels with a clone.

## Safety
- No push-target defaults — scripts throw a clear error until configured.
- Pushing also requires your own `gh` auth or a `SKILL_SYNC_TOKEN`; a clone without credentials can't
  push regardless.
- **`--dry-run`** on `new-skill` (`--publish`), `sync-skill`, and `sync-skills-catalog` prints exactly
  what would be created/pushed and exits without any network call, repo create, or push — preview an
  irreversible publish before you run it for real.

MIT licensed.
