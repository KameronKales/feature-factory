# Worked example: a log-analytics SaaS

A **complete, second-domain instance** of the Feature Factory, so you can see every product-specific
file fully filled in for a non-finance product — and diff it against the finance example that ships at
the repo root (`docs/FEATURE_PLAYBOOK.md`, `.claude/workflows/build-gap.js`).

The fictional product, **LogScope**, is a log-analytics SaaS:

| Package / app | Role |
|---------------|------|
| `packages/query` | The query engine — parsing, evaluation, aggregations. **The shared core everything depends on.** |
| `packages/api` | REST API server (and OpenAPI schema) — the programmatic surface. |
| `apps/web` | React dashboard. |
| `packages/cli` | The public `logscope` CLI — how capabilities are distributed to users. |

So LogScope's four layers are **`query · api · web · cli`**, where the finance example uses
**`engine · mcp · web · skill`**. Same spine, same Definition-of-Done shape, same resilience — only the
layer names, paths, exemplars, and verify checks differ.

## Files in this example

| File | Maps to (finance / generic) |
|------|------------------------------|
| [`FEATURE_PLAYBOOK.md`](FEATURE_PLAYBOOK.md) | `docs/FEATURE_PLAYBOOK.md` — the Definition of Done |
| [`build-gap.js`](build-gap.js) | `.claude/workflows/build-gap.js` — the build workflow |
| [`specs/saved-query-alerts.md`](specs/saved-query-alerts.md) | `docs/specs/EXAMPLE.md` — a filled spec |

A realistic **`research-gaps` output** for this product (the ranked list that would feed `build-gap`,
including the Saved Query Alerts gap below) lives at
[`../sample-research-gaps-output.json`](../sample-research-gaps-output.json).

## How you'd actually use it

These files are reference material, not wired into the live factory. To run the factory *as* LogScope
you would copy them into the real locations:

```
cp docs/examples/log-analytics/FEATURE_PLAYBOOK.md docs/FEATURE_PLAYBOOK.md
cp docs/examples/log-analytics/build-gap.js        .claude/workflows/build-gap.js
```

…then run research (no edits needed — it's product-neutral) with LogScope's domains:

```
Workflow({ name: 'research-gaps', args: {
  root: '/work/logscope',
  domains: ['ingestion & parsing', 'query language', 'alerting', 'dashboards',
            'retention & cost', 'access control', 'CLI ergonomics', 'integrations'],
  focus: 'help engineers find and alert on signals in high-volume logs fast',
  surface: 'its REST API (packages/api), the query engine (packages/query), and the CLI (packages/cli)',
} })
```

See [`../../ADAPTING.md`](../../ADAPTING.md) for the step-by-step reasoning behind these edits.
