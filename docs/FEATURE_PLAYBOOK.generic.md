# Feature Playbook — TEMPLATE (fill in for your product)

> This is the **domain-neutral skeleton** of a Definition of Done — the companion to
> [`build-gap.generic.js`](build-gap.generic.js). Copy it over `docs/FEATURE_PLAYBOOK.md` and replace
> every `{{PLACEHOLDER}}` with your product's specifics:
> ```
> cp docs/FEATURE_PLAYBOOK.generic.md docs/FEATURE_PLAYBOOK.md
> ```
> The shipped `docs/FEATURE_PLAYBOOK.md` is a *finished finance example*; this file is the *blank form*
> behind it, so you don't have to reverse-engineer a generic DoD by deleting finance prose. See
> [`ADAPTING.md`](ADAPTING.md) Step 2 ("Define *your* done"). Validate your filled `build-gap.js`
> afterward with `node scripts/validate-build-gap.mjs`.

# Feature Playbook — adding a {{PRODUCT}} capability end-to-end

> Encodes "what done looks like" so a new capability can be specced + built **without re-writing the
> success definition each time.** When the user says *"add {{CAPABILITY_NOUN}} X"*: (1) copy the spec
> template below into `docs/specs/<feature>.md` and fill the feature-specific blanks, (2) confirm the
> two standing decisions, (3) commit the spec, (4) run the standard build workflow, (5) distribute.

## Two standing decisions (ask these per feature; defaults in **bold**)
1. **Distribution** — **{{DEFAULT_DISTRIBUTION — e.g. a new dedicated skill/command when it's a
   distinct high-intent capability with its own audience}}**; otherwise fold it into
   {{FOLD_IN_TARGET — the closest existing surface}} and re-sync. (Keep the surface tight; don't sprawl.)
2. **v1 depth** — **Full** (model the hard, valuable parts properly) vs Lean (ship the common path,
   defer the edge cases). Prefer Full for {{WHERE_FULL_MATTERS}}; Lean only when speed clearly wins.

## Standing Definition of Done (constant across features — only fill `{…}`)

**1. {{SHARED_LAYER}} — `{{SHARED_PATH}}/{feature}.{{EXT}}`**
- Pure, deterministic, typed I/O; reused by every surface ({{SURFACES — e.g. API + web + CLI}}).
  **Reuse existing modules** ({{REUSE_MODULES — the primitives/constants you must not duplicate}}) —
  never re-implement or copy-paste them.
- {{SHARED_INVARIANT — any cross-cutting rule a feature of this kind MUST honor, applied at EVERY
  relevant site so one path can't silently diverge. Delete this bullet if your product has none.}}
- Inputs: `{feature inputs}`. Outputs: `{headline metric + supporting fields}`.
- Done when it matches **{{REFERENCE_FIXTURES — hand-computed scenarios / golden fixtures}}** within tolerance.

**2. Tests — `{{SHARED_PATH}}/__tests__/{feature}.test.{{EXT}}`**
- Core logic + `{feature edge cases}`. Done when {{COVERAGE_GATE — e.g. 90% branch / 100% func}} is
  met, all green, no regressions.

**3. {{USER_FACING_LAYER — e.g. Web / UI}}** *(delete this whole section if your product has no UI)*
- **Progressive disclosure**: the new UI appears only when relevant.
- **Dedicated view** mirroring an exemplar ({{UI_EXEMPLAR}}), with empty/loading guards — it MUST
  render with empty/partial input and never throw on mount.
- **Wired into the product** — the result shows up where users already work, not on an orphan page.
- **Discoverable** — add a {{DISCOVERY_ENTRY — nav item / homepage feature-list / docs page}}.
- Done when {{UI_DONE — e.g. an e2e smoke is green + a mount test renders empty without throwing}}.

**4. {{PROGRAMMATIC_LAYER — e.g. API / MCP tool / CLI command}} — `{{TOOL_NAME_PATTERN}}`**
- {{PROGRAMMATIC_CONTRACT — the thin adapter over the shared layer: route/tool/command + its schema +
  a contract test. Name the registration sites it must be wired into.}}
- **Surface parity (NON-NEGOTIABLE):** every surface ({{SURFACES}}) must produce identical results —
  they all go through the shared layer / the same endpoint. Assert it in {{PARITY_TEST}}.

**5. Distribution**
- Per decision #1: {{DISTRIBUTION_STEPS — e.g. `node scripts/new-skill.mjs <slug> [--mode local]` then
  fill SKILL.md + cross-link, OR fold the capability into <existing surface> and re-sync the catalog}}.
  Fictional examples only.

**6. Pre-ship local verification gate (NON-NEGOTIABLE — run in the MAIN LOOP, not a subagent)**
- Before ANY outward step ({{OUTWARD_STEPS — e.g. publish, tag, merge, deploy}}), the main loop MUST
  itself re-run and observe green, locally: {{VERIFY_COMMANDS — e.g.
  `node scripts/safe-jest.mjs <feature suites>` + your build + your lint}}. Subagent "verify" verdicts
  are advisory only. Fix anything flagged and re-run until clean.
- **Never mark a gap shipped/done unless every one of these passed locally in this run.** A failed or
  skipped step means the gap is partial — say so explicitly and do not deploy it.

**Non-goals:** list what v1 deliberately defers.

## Standard build workflow (phase pattern)
Run it as a `Workflow` (`build-gap`): **Investigate** (parallel, read-only) → **Synthesize** (one
plan + reference targets + disjoint file groups, one per layer) → **Implement** (shared layer first →
dependent layers in parallel → distribution last) → **Verify** (scoped suites + build/lint +
adversarial DoD check). All tests via `safe-jest`. {{OUTWARD_STEPS}} are main-loop steps after the
workflow returns.

## Copy-me spec template
Create `docs/specs/<feature>.md` from this skeleton, fill the `{…}`, then build:

```md
# Spec: {Feature}
Status: approved · Gap #{n} · Audience: {who}.
## What it answers
{the questions}
## Approved decisions
- Distribution: {new {{CAPABILITY_NOUN}} | fold into <surface>}
- v1 scope: {Full | Lean — what's in}
## Definition of Done
(Use the Standing DoD above; fill the shared-layer I/O, edge cases, UI specifics, distribution.)
## Non-goals (v1)
{deferred}
```
