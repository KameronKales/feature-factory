# Adapting the Feature Factory to your product

The factory ships with **one worked example baked into the docs and the build workflow: a
personal-finance web-app + MCP product** (FIRE %, tax modules, backtesting, an `analyze_*` MCP tool
per feature). That example is there to make the pattern concrete — **it is not a requirement.** This
guide shows you exactly which parts are generic, which parts are the example, and how to retarget the
factory at a completely different product.

If you only read one thing: **three files carry all the product-specific detail. Everything else is
domain-neutral plumbing.**

| File | What it holds | Generic or example? |
|------|---------------|---------------------|
| `.claude/workflows/research-gaps.js` | How gaps are discovered + ranked | **Generic** — every domain detail comes from `args`. Usually no edits. |
| `.claude/workflows/build-gap.js` | The 4-phase build + your layer model | **Example** (finance). This is the one file you adapt. |
| `docs/FEATURE_PLAYBOOK.md` | Your Definition of Done | **Example** (finance). Rewrite the layers for your stack. |
| `scripts/*.mjs`, `skills/feature-factory/SKILL.md` | Resilience, orchestration, distribution | **Generic.** Leave them alone. |

A neutral, finance-free starting point for the build workflow lives at
[`docs/build-gap.generic.js`](build-gap.generic.js) — copy it over `build-gap.js` if you'd rather
start from a blank architecture than strip the finance one.

---

## The 3-step adaptation

### Step 1 — Run research as-is (no edits)

`research-gaps.js` is already product-neutral. Point it at your repo and describe your domain through
`args` — nothing is hardcoded:

```
Workflow({ name: 'research-gaps', args: {
  root: '/abs/path/to/your/repo',
  domains: [ ...the areas your product should cover... ],
  focus: 'what your product is really for',
  surface: 'where your product’s capabilities live — e.g. its REST API + CLI',
} })
```

It returns a ranked, build-ready gap list: `{ slug, name, description, audience, evidence,
recommended_tool, distribution, skill_route, scope, priority }`. That shape is fixed and feeds
`build-gap` directly — you don't change it per domain.

### Step 2 — Define *your* "done" in `FEATURE_PLAYBOOK.md`

This is the heart of the adaptation. The finance playbook says every gap ships an **engine + tests +
web panel + MCP tool + distribution + a pre-ship verify gate**. Keep the *shape* (a fixed, repeatable
Definition of Done with a non-negotiable local verify gate) and **replace the layers with whatever
"shipped" means for your product.** Two rules survive every domain:

- **There is a Definition of Done, written down once**, so success isn't re-invented per feature.
- **The main loop re-runs the full verify gate locally before anything ships** — subagent verdicts
  are advisory only, and partial work is never marked done.

### Step 3 — Map your layers in `build-gap.js`

`build-gap.js` keeps a fixed **spine** — *Investigate → Synthesize → Implement → Verify* — and a set
of **disjoint file groups** that can be built in parallel without colliding. The finance example uses
four groups keyed `engine | mcp | web | skill`. Change the **keys, the file paths each group owns, the
exemplar files agents are pointed at, and the verify checks** to match your stack. Keep the spine and
keep `safe-jest` as the test runner.

---

## Worked example: a developer-tools API product

Say your product is **a log-analytics SaaS** — a TypeScript API server (`packages/api`), a query
engine (`packages/query`), a React dashboard (`apps/web`), and a public CLI (`packages/cli`). You
distribute capabilities as CLI subcommands, not MCP skills. Here's how the three files change.

> **A complete, copy-pasteable version of this example** — the fully-retargeted Playbook, the full
> `build-gap.js`, and a filled spec — lives in [`docs/examples/log-analytics/`](examples/log-analytics/).
> Diff those files against the finance originals at the repo root to see exactly what changes. The
> summary below is the reasoning; that directory is the artifact.

**Research (`args` only — no file edits):**

```
Workflow({ name: 'research-gaps', args: {
  root: '/work/logscope',
  domains: ['ingestion & parsing', 'query language', 'alerting', 'dashboards',
            'retention & cost', 'access control', 'CLI ergonomics', 'integrations'],
  focus: 'help engineers find and alert on signals in high-volume logs fast',
  surface: 'its REST API (packages/api), the query engine (packages/query), and the CLI (packages/cli)',
} })
```

**Playbook (`FEATURE_PLAYBOOK.md`) — the layers become:**

| Finance example layer | Log-analytics layer |
|-----------------------|---------------------|
| `engine` — `src/lib/{feature}.ts`, Zod I/O, reference-validated | `query` — `packages/query/src/{feature}.ts`, pure parser/evaluator, golden-query fixtures |
| `web` — input panel + results panel + homepage | `web` — `apps/web` dashboard widget + nav entry + docs page |
| `mcp` — `analyze_{feature}` self-orchestrating tool | `api` — `packages/api` route + OpenAPI schema + contract test |
| `skill` — skill repo + catalog | `cli` — `packages/cli` subcommand + `--help` + completion |

Each still ships tests to a coverage gate, and the **pre-ship verify gate** still runs the suites +
build + lint locally in the main loop before anything merges or deploys.

**Build (`build-gap.js`) — change the group keys + paths:**

```js
const PLAN = { /* ... */ properties: {
  // ...
  groups: { type: 'array', items: { /* ... */ properties: {
    key: { type: 'string', enum: ['query', 'api', 'web', 'cli'] },  // ← your layers
    // ...
  } } } } }
```

…and point the Investigate/Implement agent briefs at *your* exemplar files (`packages/query/src/sum.ts`
as the engine pattern, an existing dashboard widget as the web pattern, an existing CLI subcommand as
the distribution pattern) instead of the finance ones (`EquityCompensationPanel`, `analyze_*`, etc.).

The implement order follows dependencies: build the shared layer first (here `query`, the finance
example's `engine`), then the layers that depend on it in parallel (`api ∥ web`), then distribution
(`cli`) last because it needs the capability registered.

---

## What you should NOT change

- **The resilience scripts** (`safe-jest.mjs`, `keep-awake.mjs`) — domain-neutral, cross-platform.
- **`skills/feature-factory/SKILL.md`** — the orchestration loop (arm → research → build each gap →
  verify locally → ship → tear down) is the same for every product.
- **The `research-gaps` output schema** and the **Investigate→Synthesize→Implement→Verify** spine.
- **The "main loop verifies locally before shipping" rule.** This is the one guardrail that keeps an
  unattended run honest in any domain.

## Checklist

- [ ] `scripts/factory.config.json` filled in (`org` + `catalogRepo` at minimum — see the README).
- [ ] `FEATURE_PLAYBOOK.md` layers rewritten for your stack; the verify gate kept intact.
- [ ] `build-gap.js` group keys, file paths, exemplar references, and verify checks updated.
- [ ] A first spec written from the playbook template (see [`docs/specs/EXAMPLE.md`](specs/EXAMPLE.md)).
- [ ] `research-gaps` run once against your repo to confirm the gap list looks sane before building.
