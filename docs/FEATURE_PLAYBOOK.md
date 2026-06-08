> ⚠️ EXAMPLE — this Definition of Done is a worked example from a personal-finance product. Keep the
> STRUCTURE (engine → tests → web → MCP → distribution + pre-ship verify gate); replace the
> finance-specific details (FIRE %, tax modules, backtesting, etc.) with your product domain.

# Feature Playbook — adding a financial tool end-to-end

> Encodes "what done looks like" so a new capability can be specced + built **without
> re-writing the success definition each time.** When the user says *"add financial tool X"*:
> (1) copy the DoD template below into `docs/specs/<feature>.md` and fill only the feature-specific
> blanks, (2) confirm the two standing decisions, (3) commit the spec, (4) run the standard build
> workflow, (5) distribute via the factory. Worked example: `docs/specs/self-employed-retirement.md`.

## Two standing decisions (ask these per feature; defaults in **bold**)
1. **Distribution** — **a new dedicated skill repo (`<org>/<prefix><skill>` + catalog) when it's a
   distinct high-intent vertical** with its own query intent and audience; otherwise fold the tool
   into the closest existing skill(s) and re-sync. (Keep total skills ~6–10; don't sprawl.)
2. **v1 depth** — **Full** (model the hard, valuable parts properly) vs Lean (ship the common path,
   defer the edge cases). Prefer Full for decision-grade tools; Lean only when speed clearly wins.

## Standing Definition of Done (constant across features — only fill `{…}`)

**1. Engine — `src/lib/{feature}.ts`**
- Pure, deterministic, Zod-typed I/O; reused by web + worker. **Reuse existing modules**
  (`federal-tax`, `state-tax`, `tax-limits`, etc.) — never duplicate brackets/limits. 2026 via `DEFAULT_TAX_YEAR`.
- **If the feature is (or includes) a DEBT, it MUST flow through the existing debt architecture**
  (`debt-model.ts` → `NetWorthInput.debts` via `debtContributionAdjustment` + `totalDebtBalance`) so the
  outstanding **balance subtracts from net worth** and the **freed payment redirects into investing on
  payoff** — never an ad-hoc cash-flow subtraction. Because the engine is shared, this holds in **both**
  the web app and the MCP; expose the debt in the MCP `generate_financial_plan` schema (the `debts[]`
  array, or a mapped feature input) so it isn't handled differently there. (See `studentLoanAsModelDebt`.)
- **If the feature brings in INCOME (pension, annuity, bond-ladder floor, …), it MUST flow through
  the shared retirement-income mechanism** — a `getXIncome(input, age, year)` helper subtracted from
  the retirement net-spend alongside `getSocialSecurityIncome`, applied at **every** income-aware
  calc: the net-worth projection, the **Monte Carlo backtesting** spend, AND the **FIRE %** calc.
  Never a one-off that only one path sees (a missed site silently ignores the income in
  backtesting/FIRE%). (See `getGuaranteedIncome` / `getBondLadderFloor`.)
- Inputs: `{feature inputs}`. Outputs: `{headline metric + supporting fields}`.
- Done when it matches **hand-computed reference scenarios** within tolerance.

**2. Tests — `src/lib/__tests__/{feature}.test.ts`**
- Core math + `{feature edge cases}`. Done when engine coverage thresholds met (90% branch / 100%
  func), all green, no regressions.

**3. Web app (sensible information architecture)**
- **Progressive disclosure**: a toggle/section in the inputs panel reveals `{feature inputs}` only when relevant.
- **Dedicated results panel** mirroring `EquityCompensationPanel`/`AdvancedTaxesPanel`, with tooltips,
  assumption surfacing, and the `typeof === 'number' ? … : 'Calculating…'` guard.
- **Wired into the forecast** (the result affects net worth / FIRE — not siloed).
- **Surface it on the marketing homepage** — add the new capability to the homepage feature
  list / "what you can do" section so shipped features are publicly discoverable as we go. (Locate
  the homepage/landing route during the web investigate step; keep copy consistent with siblings.)
- Command-palette entry + keyboard parity; accessible; no console errors. Done when e2e is green + a new smoke spec.
- **Crash-safety (NON-NEGOTIABLE): a new feature must never break existing features or stop the
  app from loading.** The panel MUST render with empty / disabled / partial input. NEVER call the
  engine or a strict schema's `.parse()` unguarded on mount — a thrown `ZodError` (missing field or
  refinement) bubbles to the `ErrorBoundary` and blanks the whole app. Use `safeParse` + a fallback
  to build UI state, and gate the analysis behind `enabled` + `try/catch`. **Done when a mount smoke
  test renders the panel with an empty model without throwing.**

**4. MCP — `analyze_{feature}`**
- Thin **self-orchestrating** adapter: `registerTool` (→ structuredContent), `assumed_defaults[]`,
  `share_url` when a plan is in scope, `next_actions`, `disclosures`, `_meta`; optional `plan_id`.
  Wired into `tool-names` + `index.ts` + `tool-edges` + the smoke test (count). Uses
  `lib/assumed-defaults.ts` + `lib/share.ts`. Done when FakeServer tests pass + a live call returns the headline.
- **Web/MCP plan parity (NON-NEGOTIABLE): the web app and the MCP must be identical.** If the feature
  adds a field to `NetWorthInput`, it MUST also be added to the MCP `generate_financial_plan` input —
  `PlanInputSchema` **and** the mapper (`PlanRequest` + `mapToNetWorthInput` pass-through) — so a plan
  built via MCP equals one built in the web app. **Add it to `test/plan-feature-parity.test.ts`'s feature
  list** (asserts reachable + mapped + runs end-to-end). A standalone `analyze_*` tool is NOT a substitute.
- **NEVER import `shared-model` (or any module whose closure reaches it) into `plan-schema.ts` or other
  early-loaded Worker modules.** `shared-model ↔ backtesting-calculator` is a circular import whose
  constructor eagerly fetches a relative URL — pulled in at module-load it crashes the bundled Worker
  (1101, worker-wide). To validate a plan feature, import its **leaf** engine schema and check the
  closure is shared-model-free (`featureValidated()` in plan-schema; see the closure script in that PR).
  A feature whose leaf transitively pulls `shared-model` (e.g. student-loans → healthcare-calculator)
  stays a permissive passthrough, validated downstream by the engine, until the cycle is broken.

**5. Distribution**
- Per decision #1: factory-mint a new skill (`scripts/new-skill.mjs`) → `<org>/<prefix><skill>`
  + list in `<your-catalog-repo>`, **or** add the tool to existing skill SKILL.md(s) + re-sync.
  Fictional examples only; cross-link related skills.

**6. Pre-ship local verification gate (NON-NEGOTIABLE — run in the MAIN LOOP, not a subagent)**
- Before ANY outward step (remote repo create, sync, merge, deploy), the main loop MUST itself
  re-run and observe green, locally: `node scripts/safe-jest.mjs <feature suites>` + `node
  scripts/safe-jest.mjs --worker` + `npm run build` + `npm run lint`. Subagent "verify" verdicts are
  advisory only — do NOT ship on a subagent's word. Fix anything flagged and re-run until clean.
- **Never mark a gap shipped/done unless every one of these passed locally in this run.** If a step
  fails or is skipped, the gap is partial — say so explicitly and do not deploy it.

**Non-goals:** list what v1 deliberately defers.

## Standard build workflow (phase pattern)
Run it as a `Workflow` (the layers are cross-cutting and benefit from parallel investigation + a
verify gate):
1. **Investigate** (parallel, read-only): engine references + exact formulas/limits · web IA + file
   manifest · MCP/skill scaffold pattern.
2. **Synthesize**: one build plan — engine API + algorithm + **hand-computed reference targets** +
   four **disjoint-file** groups keyed `engine | mcp | web | skill`
   (`engine` owns `src/lib` incl. model/shared-model wiring; `web` owns `src/components`+`src/app`+`e2e`;
   `mcp` owns `workers/ai-mcp`; `skill` owns `skills/`+marketplace).
3. **Implement**: `engine` first (everyone depends on it) → `mcp` ∥ `web` (disjoint) → `skill` (needs the tool registered).
4. **Verify** (parallel): scoped suites + worker suite + `npm run build`/`lint` + typecheck · adversarial
   check that the engine hits the reference targets and every DoD item is met.

Remote repo creation + first-sync + merge/deploy are **main-loop** steps after the workflow (not done by subagents).

## Copy-me spec template
Create `docs/specs/<feature>.md` from this skeleton, fill the `{…}`, then build:

```md
# Spec: {Feature}
Status: approved · Gap #{n} · Audience: {who}.
## What it answers
{the questions}
## Approved decisions
- Distribution: {new skill repo <prefix><skill> | fold into <skills>}
- v1 scope: {Full | Lean — what's in}
## Definition of Done
(Use the Standing DoD above; fill engine inputs/outputs, edge cases, web IA specifics, skill cross-links.)
## Non-goals (v1)
{deferred}
```

See also: `SKILL_STRATEGY.md` (portfolio + authoring principles), `SKILL_AUTHORING.md` (factory mechanics).
