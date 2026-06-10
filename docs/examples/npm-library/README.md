# Worked example: a single-package npm library

The finance and log-analytics examples are both **4-layer monorepos with a web UI**. That can read as
"the factory only fits big multi-package products." It doesn't. This example is the **smallest sensible
shape**: a single-package, **no-UI** npm library with **one test root** and **no MCP/web layer at all**.

The fictional product, **`slugify-pro`**, is one package: a string-slugify library published to npm.

## How this shape differs

| | finance / log-analytics | this npm library |
|---|---|---|
| Layers | 4 (`engine·mcp·web·skill`) | **2** (`core · dist`) |
| Test roots | 2 (uses `safe-jest --worker`) | **1** (never use `--worker`) |
| UI layer | yes | **none** — delete the web section of the DoD |
| Programmatic surface | MCP tool / REST | the library's **public API** (exported functions) |
| Distribution | skill repo + catalog | **`npm publish`** + README/CHANGELOG |

It's the same spine (Investigate → Synthesize → Implement → Verify) and the same non-negotiable
pre-ship verify gate — just fewer layers.

## Files

- [`FEATURE_PLAYBOOK.md`](FEATURE_PLAYBOOK.md) — the DoD trimmed to two layers, no UI.
- [`build-gap.js`](build-gap.js) — a 2-layer build workflow (`core` → `dist`).

## Activating it

```
cp docs/examples/npm-library/FEATURE_PLAYBOOK.md docs/FEATURE_PLAYBOOK.md
cp docs/examples/npm-library/build-gap.js        .claude/workflows/build-gap.js
node scripts/validate-build-gap.mjs              # confirm placeholders filled + layers consistent
```

Research needs no edits — just describe the library through `args`:

```
Workflow({ name: 'research-gaps', args: {
  root: '/work/slugify-pro',
  domains: ['core API surface', 'unicode/edge-case correctness', 'performance',
            'types & DX', 'docs & examples', 'bundle size'],
  focus: 'turn arbitrary strings into clean, collision-free URL slugs',
  surface: 'its exported public API (src/index.ts) and the published package',
} })
```

Distribution here is `npm publish`, not a skill — so `new-skill.mjs` / the catalog scripts don't apply.
That's expected: the factory's distribution layer is whatever shipping means for *your* product.
