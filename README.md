# Feature Factory

A hands-off, **project-agnostic** loop that discovers the highest-value gaps in a product, then builds
and ships each one end-to-end (engine → tests → UI → API/MCP → distribution) to a fixed Definition of
Done — designed to run unattended and recover from the usual things that derail long runs.

**100% Node.js.** Runs identically on Windows, macOS, and Linux. The only external CLIs are `node`,
`npm`, `git`, and `gh` (for publishing) — all install natively on every OS.

See [`docs/FEATURE_FACTORY.md`](docs/FEATURE_FACTORY.md) for the full architecture.

---

## Setup (any project)

1. **Copy these files into your repo** (or use this as a starting point):
   - `scripts/*.mjs` — the reusable harness + distribution scripts
   - `scripts/catalog-readme.template.md` — your catalog page (edit the prose)
   - `.claude/workflows/*.js` — the research + build workflows (customize for your domain)
   - `docs/FEATURE_PLAYBOOK.md` — your Definition of Done (customize)
   - `skills/feature-factory/` — the orchestration the assistant follows

2. **Configure** — copy the example and fill in YOUR values:
   ```
   cp scripts/factory.config.example.json scripts/factory.config.json
   ```
   There are **no built-in defaults for push targets** (org, catalog repo). The sync/publish scripts
   **refuse to run** until you set `org` + `catalogRepo` — so a clone can never accidentally push to
   someone else's repos. (You can also set everything via `FACTORY_*` env vars instead of the file.)

3. **Run** — in Claude Code, say *"run the feature factory"* (or invoke the `feature-factory` skill).

## The scripts

| Script | What it does |
|--------|--------------|
| `scripts/safe-jest.mjs` | Hang-proof test runner (hard timeout kills the process tree). Use instead of bare `npx jest`. |
| `scripts/keep-awake.mjs` | OS-independent keep-awake for long runs (caffeinate / Windows / systemd / heartbeat). |
| `scripts/new-skill.mjs` | Scaffold a new skill + register it in the marketplace + optional publish. |
| `scripts/sync-skill.mjs` | Mirror one skill to its public repo. |
| `scripts/sync-skills-catalog.mjs` | Mirror all skills + a generated catalog README to the catalog repo. |
| `scripts/factory.config.mjs` | Reads `factory.config.json` / env; the single source of project identity. |

## Configuration keys

| JSON key | Env var | Required? | Meaning |
|----------|---------|-----------|---------|
| `org` | `FACTORY_ORG` | **yes** | GitHub org/user that owns the per-skill repos |
| `catalogRepo` | `FACTORY_CATALOG_REPO` | **yes** | The single public catalog repo (`owner/name`) |
| `skillRepoPrefix` | `FACTORY_SKILL_REPO_PREFIX` | no (default `""`) | Prefix for per-skill repo names |
| `monorepo` | `FACTORY_MONOREPO` | no | Source-of-truth repo slug (shown in generated docs) |
| `productName` | `FACTORY_PRODUCT_NAME` | no | Display name in generated READMEs |
| `mcpUrl` | `FACTORY_MCP_URL` | no | Your public MCP server URL |
| `gitName` / `gitEmail` | `SYNC_GIT_NAME` / `SYNC_GIT_EMAIL` | no | Commit identity for sync pushes |
| `legacyRepos` | `FACTORY_LEGACY_REPOS` | no | Map of skills whose repo name differs from the convention |

`scripts/factory.config.json` is **gitignored** — your project identity never travels with a clone.

## Safety
- No push-target defaults — scripts throw a clear error until configured.
- Pushing also requires your own `gh` auth or a `SKILL_SYNC_TOKEN`; a clone without credentials can't
  push regardless.

MIT licensed.
