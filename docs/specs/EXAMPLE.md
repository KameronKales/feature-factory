# Spec: HSA Contribution Optimizer  *(EXAMPLE — illustrates the spec template)*

> A filled-in example of the "copy-me spec template" in
> [`../FEATURE_PLAYBOOK.md`](../FEATURE_PLAYBOOK.md). It uses the **finance product** that playbook
> describes, so the layers line up with the Standing DoD you'd actually follow here. When you build a
> real feature, copy the template, fill the `{…}` blanks, commit it as `docs/specs/<your-feature>.md`,
> then run the build workflow.
>
> Want the same template applied to a **different domain**? See the fully-worked log-analytics
> instance in [`../examples/log-analytics/`](../examples/log-analytics/) (its own playbook + build
> workflow + spec).

Status: approved · Gap #4 · Audience: savers with a high-deductible health plan deciding how much to
route to an HSA vs other accounts.

## What it answers
- "How much can I contribute to my HSA this year, and what's the tax savings vs taxable investing?"
- "Where does the HSA sit in my funding waterfall once it's maxed?"

## Approved decisions
- **Distribution:** fold into the existing tax-advantaged-accounts skill (not a distinct high-intent
  vertical → no new skill repo). Re-sync the catalog.
- **v1 scope:** Lean — contribution limit + triple-tax-advantage projection + waterfall placement.
  Defer the post-65 non-medical-withdrawal and Medicare-interaction edge cases.

## Definition of Done
Per the Standing DoD in `FEATURE_PLAYBOOK.md`:

- **engine** (`src/lib/hsa.ts`) — pure, Zod-typed: given age, coverage tier, and the plan, returns
  `{ contributionLimit, taxSavings, projectedBalance }`. **Reuse** `tax-limits` (the IRS HSA limits +
  catch-up) and `federal-tax`/`state-tax` for the marginal-rate savings — never hardcode brackets or
  limits; 2026 via `DEFAULT_TAX_YEAR`. If maxed, the surplus flows through the existing funding
  waterfall. Done when it matches hand-computed reference scenarios within tolerance.
- **tests** (`src/lib/__tests__/hsa.test.ts`) — core math + edge cases (family vs self-only tier, the
  55+ catch-up, mid-year coverage change). Done at 90% branch / 100% func, green, no regressions.
- **web** — progressive-disclosure HSA section in the inputs panel; a dedicated results panel
  mirroring `AdvancedTaxesPanel` with the `typeof === 'number' ? … : 'Calculating…'` guard; wired into
  the forecast (the balance affects net worth); a homepage feature-list entry; command-palette entry;
  an e2e smoke. Renders safely with an empty model (mount test, no throw).
- **mcp** — `analyze_hsa` self-orchestrating tool (registerTool → structuredContent,
  `assumed_defaults[]`, `share_url`, `next_actions`, `disclosures`, `_meta`), wired into
  `tool-names` + `index.ts` + `tool-edges` + the smoke-test count. Add the HSA fields to
  `generate_financial_plan` (schema + mapper) and to `plan-feature-parity.test.ts` so web and MCP agree.
- **distribution** — add `analyze_hsa` to the tax-advantaged-accounts skill's SKILL.md + cross-link;
  re-sync the catalog. Fictional examples only.
- **Pre-ship verify gate (main loop, non-negotiable):** `node scripts/safe-jest.mjs src/lib/__tests__/hsa`
  + `node scripts/safe-jest.mjs --worker` + `npm run build` + `npm run lint`, all green locally, before
  any sync/merge/deploy. Subagent verdicts are advisory only.

## Non-goals (v1)
- Post-65 non-medical withdrawals (taxed as ordinary income) and Medicare-enrollment cutoffs.
- Employer-contribution proration for mid-year hires.
- HSA-as-investment-account glidepath modeling.
