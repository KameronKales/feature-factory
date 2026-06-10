# Feature Playbook — adding a `slugify-pro` capability  *(minimal worked example)*

> The Definition of Done trimmed to the **smallest sensible shape**: a single-package npm library with
> **two layers** (`core · dist`), **no UI**, and **one test root**. Compare with the 4-layer finance
> playbook (`docs/FEATURE_PLAYBOOK.md`) to see what drops out when a product is small. See
> [`../../ADAPTING.md`](../../ADAPTING.md) and [`README.md`](README.md).

## Two standing decisions (defaults in **bold**)
1. **Distribution** — there's one surface: the published package. A capability is either part of the
   **public API** (exported) or an **internal helper** (not exported). No new-skill/fold-in choice.
2. **v1 depth** — **Full** for anything on the public API (you can't un-ship an API); Lean only for
   internal helpers.

## Standing Definition of Done (only fill `{…}`)

**1. core — `src/{feature}.ts` (+ export from `src/index.ts` if public)**
- Pure, deterministic, fully typed I/O. **Reuse existing internals** (the normalize/transliterate
  helpers) — never duplicate them. No new runtime dependency without a note in the spec.
- Inputs: `{feature inputs}`. Outputs: `{return shape}`. Public API additions are **semver-aware**
  (additive = minor; any change to existing behavior = major).
- Done when it matches hand-written reference cases (incl. unicode / empty / collision edge cases)
  within tolerance, and `src/index.ts` exports exactly what the spec says (no accidental surface).

**2. Tests — `src/__tests__/{feature}.test.ts`**
- Core behavior + `{feature edge cases}`. Done at 100% function / 90% branch on the new module, all
  green, no regressions. Run with `node scripts/safe-jest.mjs src/__tests__/{feature}` — **one test
  root, so never `--worker`.**

*(No UI layer and no separate API/MCP layer — the library's exported functions ARE the programmatic
surface. Delete those sections rather than leaving them empty.)*

**3. Distribution — npm**
- Update `README.md` (usage + a fictional example) and `CHANGELOG.md`; bump the version per semver.
- Done when `npm pack` produces the intended files (check the tarball) and the typed entry points
  resolve. `npm publish` itself is a **main-loop step after the verify gate**, never a subagent's job.

**4. Pre-ship local verification gate (NON-NEGOTIABLE — MAIN LOOP, not a subagent)**
- Before publish/tag: `node scripts/safe-jest.mjs src/__tests__/{feature}` + `npm run build` (types) +
  `npm run lint` + `npm pack --dry-run`, all green locally. Fix anything flagged and re-run until clean.
- **Never mark shipped unless every step passed locally this run.** A skipped step = partial; say so.

**Non-goals:** list what v1 defers.

## Standard build workflow
`build-gap` with **two** disjoint groups: `core` (owns `src/` incl. tests + the `index.ts` export) →
`dist` (owns `README.md` + `CHANGELOG.md` + `package.json` version). Investigate → Synthesize →
Implement (`core` then `dist`) → Verify. `npm publish` is a main-loop step afterward.

## Copy-me spec template
```md
# Spec: {Feature}
Status: approved · Gap #{n} · Audience: {who}.
## What it answers
{the questions}
## Approved decisions
- Surface: {public API export | internal helper}
- v1 scope: {Full | Lean}
## Definition of Done
(Use the Standing DoD above; fill core I/O, edge cases, semver impact, README/CHANGELOG.)
## Non-goals (v1)
{deferred}
```
