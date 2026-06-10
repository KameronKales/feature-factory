# Contributing to the Feature Factory

The factory demands a strict Definition of Done from the products it builds — this repo holds itself to
the same bar. This guide is the on-ramp.

## What this repo is

A **project-agnostic harness**, not a product. It's 100% Node.js with **zero npm dependencies** (only
Node built-ins + `node --test`), so it runs identically on Windows, macOS, and Linux. Anything
product-specific (the finance example) is clearly labeled as an example.

Layout:

| Path | What lives here |
|------|-----------------|
| `scripts/*.mjs` | The reusable helper scripts (test runner, keep-awake, skill scaffolding/sync). Pure Node, OS-independent. |
| `.claude/workflows/*.js` | The research + build workflows (run by the `Workflow` tool). |
| `skills/feature-factory/` | The orchestration the assistant follows. |
| `docs/` | Architecture, quickstart, adapting, playbook, troubleshooting, and worked examples. |
| `templates/skill/` | The template a new skill is scaffolded from. |
| `scripts/__tests__/` | The harness's own test suite. |

## Setup

```
git clone <repo> && cd feature-factory
node --version   # >= 18
```

No `npm install` needed — there are no dependencies.

## Running the checks

Two commands, two purposes:

- **`npm run check`** — parse-checks every `scripts/*.mjs` with `node --check`. This is the factory's
  lint/typecheck gate (the scripts are plain ESM, so a syntax parse is the meaningful static check).
  Fast; run it after touching any script.
- **`npm test`** — runs the test suite in `scripts/__tests__/` via `node --test`. Run it before every
  commit. It guards both the scripts and the workflows (workflows can't be `node --check`ed because
  they use a top-level `return` that's only valid inside the `Workflow` runtime — `workflows.test.mjs`
  checks their content instead).

CI (`.github/workflows/ci.yml`) runs both on every push and PR. **A change isn't done until both pass
locally.**

## Conventions

- **Pure Node built-ins only.** No new npm dependencies, no bash/`jq`/`rsync`/`perl`/`caffeinate` —
  the cross-platform guarantee depends on it. If you need an OS tool, shell out with a graceful
  fallback (see `keep-awake.mjs`).
- **Match the surrounding style.** Scripts open with a usage comment, support `--help`, and exit `2`
  on misuse. Keep that consistent.
- **No secrets in committed files.** Webhooks/tokens live in `factory.config.json` (gitignored) or
  env vars. No default push targets — ever.
- **Keep the product-specific bits labeled.** `research-gaps.js` must stay product-neutral;
  `build-gap.js` and `FEATURE_PLAYBOOK.md` are honestly labeled finance examples. Don't leak one
  product's paths into the generic layer (`workflows.test.mjs` enforces this).

## Adding things

**A new helper script (`scripts/*.mjs`):**
1. Pure Node built-ins; open with a usage comment; support `--help`/`-h` and exit `2` on misuse.
2. `npm run check` picks it up automatically (it scans `scripts/*.mjs`).
3. Add a test in `scripts/__tests__/` and a row to the script table in `README.md` /
   `docs/FEATURE_FACTORY.md`.

**A new workflow (`.claude/workflows/*.js`):**
1. Start from the shape of `research-gaps.js` / `build-gap.js` — `export const meta = {…}` (pure
   literal) then the body.
2. It won't pass `node --check` (top-level `return`); guard its content in `workflows.test.mjs` instead.
3. Document how to invoke it (`Workflow({ name, args })`) in the relevant doc.

**A doc change:** keep the cross-references intact — the reading order is README → `QUICKSTART` →
`FEATURE_FACTORY` → `ADAPTING` → `FEATURE_PLAYBOOK`, with `TROUBLESHOOTING` linked throughout. Don't
reference files that don't exist.

## Pull requests

- Branch off `main`; keep PRs focused.
- State what you changed and that `npm run check` + `npm test` pass locally.
- If you touched a script's interface, update its `--help` and the docs in the same PR.
