# Feature Playbook — adding a LogScope capability end-to-end  *(worked example)*

> This is the **finance playbook (`docs/FEATURE_PLAYBOOK.md`) fully retargeted to a log-analytics
> product**, so you can see what a non-finance Definition of Done looks like end to end. The
> STRUCTURE is identical — a fixed DoD per layer + a non-negotiable pre-ship verify gate; only the
> domain specifics changed. See [`../../ADAPTING.md`](../../ADAPTING.md).

> Encodes "what done looks like" so a new capability can be specced + built **without re-writing the
> success definition each time.** When the user says *"add capability X"*: (1) copy the DoD template
> below into `docs/specs/<feature>.md` and fill the feature-specific blanks, (2) confirm the two
> standing decisions, (3) commit the spec, (4) run the standard build workflow, (5) distribute via the
> CLI. Worked example spec: [`specs/saved-query-alerts.md`](specs/saved-query-alerts.md).

## Two standing decisions (ask these per feature; defaults in **bold**)
1. **Distribution** — **a new top-level `logscope <command>` group when it's a distinct high-intent
   workflow** with its own audience; otherwise fold the capability into the closest existing command
   group and re-sync docs. (Keep the top-level command surface tight; don't sprawl.)
2. **v1 depth** — **Full** (model the hard, valuable parts properly) vs Lean (ship the common path,
   defer the edge cases). Prefer Full for anything on the alerting/query hot path; Lean only when speed
   clearly wins.

## Standing Definition of Done (constant across features — only fill `{…}`)

**1. Query engine — `packages/query/src/{feature}.ts`**
- Pure, deterministic, typed I/O; reused by the API, web, and CLI. **Reuse existing query primitives**
  (operators, time-window helpers, aggregation fns) — never re-implement query parsing or duplicate
  the operator table. Time handling goes through the shared `TimeRange` util, not ad-hoc parsing.
- **If the feature reads stored events, it MUST go through the existing `QueryPlan` pipeline**
  (`parse → plan → evaluate`) so it inherits indexing, retention windows, and access scoping — never a
  direct store read that bypasses retention/ACL. Because the engine is shared, this holds for the API,
  web, AND CLI paths; a bypass in one surface silently leaks events the other surfaces would filter.
- **If the feature emits notifications (alerts, digests, webhooks), it MUST flow through the shared
  `NotificationChannel` abstraction** — registered once and dispatched from the single alert evaluator,
  applied at **every** trigger site (scheduled evaluation, manual re-run, AND backfill). Never a one-off
  send that only the scheduled path sees (a missed site means manual re-runs fire no notification).
- Inputs: `{feature inputs}`. Outputs: `{headline metric + supporting fields}`.
- Done when it matches **golden-query fixtures** (recorded query + expected result) within tolerance.

**2. Tests — `packages/query/src/__tests__/{feature}.test.ts`**
- Core evaluation + `{feature edge cases}` (empty result set, retention boundary, malformed rule).
  Done when query-engine coverage thresholds met (90% branch / 100% func), all green, no regressions.

**3. API — `packages/api` (`POST /{feature}`, `GET /{feature}/:id`)**
- Thin handler over the engine; **OpenAPI schema updated** and a **contract test** added. The web app
  and CLI both call these routes — the route is the single source of truth, no logic duplicated client-side.
- **Surface parity (NON-NEGOTIABLE): web and CLI must produce identical results.** Both go through the
  same route; assert it in `test/surface-parity.test.ts` (same input → same response from a web-shaped
  and a CLI-shaped call). A client-side shortcut that skips the API is NOT allowed.
- Errors use the standard `{ code, message, details }` envelope; new error codes registered in `errors.ts`.

**4. Web — `apps/web`**
- **Progressive disclosure**: the new UI (tab/panel/widget) appears only when relevant (e.g. only on a
  saved query, only when the feature is configured).
- **Dedicated panel** mirroring an existing one (e.g. `SavedQueryPanel`), with empty/loading guards:
  the panel MUST render with no data configured and never throw on mount.
- **Wired into the product** — the result shows up where users already work (the query view / the
  dashboard), not on an orphan page. Add a **nav entry + a docs page** so shipped features are discoverable.
- Keyboard-accessible; no console errors. Done when the e2e smoke is green + a mount test renders the
  panel with an empty/unconfigured state without throwing.

**5. CLI — `packages/cli` (`logscope {feature} …`)**
- Subcommand(s) calling the API route; `--help` text, examples, and **shell completion** entries.
- Per decision #1: a **new top-level command group** (`logscope {feature}`) for a distinct workflow,
  **or** new subcommands folded into an existing group (e.g. `logscope alert add`). Either way update the
  CLI reference docs. Fictional examples only.
- Done when the CLI integration test drives the command against a fake API and asserts output + exit code.

**6. Pre-ship local verification gate (NON-NEGOTIABLE — run in the MAIN LOOP, not a subagent)**
- Before ANY outward step (publish, tag, deploy), the main loop MUST itself re-run and observe green,
  locally: `node scripts/safe-jest.mjs packages/query/src/__tests__/{feature}` + the API contract suite
  + the CLI integration suite + `npm run build` + `npm run lint`. Subagent "verify" verdicts are
  advisory only — do NOT ship on a subagent's word. Fix anything flagged and re-run until clean.
- **Never mark a gap shipped/done unless every one of these passed locally in this run.** If a step
  fails or is skipped, the gap is partial — say so explicitly and do not deploy it.

**Non-goals:** list what v1 deliberately defers.

## Standard build workflow (phase pattern)
Run it as a `Workflow` (the layers are cross-cutting and benefit from parallel investigation + a
verify gate):
1. **Investigate** (parallel, read-only): query-engine references + exact semantics · web IA + file
   manifest · API route + CLI command patterns.
2. **Synthesize**: one build plan — engine API + algorithm + **golden-query targets** + four
   **disjoint-file** groups keyed `query | api | web | cli` (`query` owns `packages/query`; `api` owns
   `packages/api`; `web` owns `apps/web`; `cli` owns `packages/cli` + docs).
3. **Implement**: `query` first (everyone depends on it) → `api ∥ web` (disjoint) → `cli` (needs the route).
4. **Verify** (parallel): scoped suites + contract + CLI integration + `npm run build`/`lint` ·
   adversarial check that the engine hits the golden targets and every DoD item is met.

Publish / tag / deploy are **main-loop** steps after the workflow (not done by subagents).

## Copy-me spec template
Create `docs/specs/<feature>.md` from this skeleton, fill the `{…}`, then build:

```md
# Spec: {Feature}
Status: approved · Gap #{n} · Audience: {who}.
## What it answers
{the questions}
## Approved decisions
- Distribution: {new `logscope <cmd>` group | fold into <existing group>}
- v1 scope: {Full | Lean — what's in}
## Definition of Done
(Use the Standing DoD above; fill engine inputs/outputs, edge cases, web IA, CLI command shape.)
## Non-goals (v1)
{deferred}
```
