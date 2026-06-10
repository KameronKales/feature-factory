# Spec: Saved Query Alerts  *(EXAMPLE — illustrates the spec template)*

> This is a filled-in example of the "copy-me spec template" in
> [`../FEATURE_PLAYBOOK.md`](../FEATURE_PLAYBOOK.md). It uses a **log-analytics product** so the
> structure is clear without finance context. When you build a real feature, copy the template, fill
> the `{…}` blanks for *your* domain, commit it as `docs/specs/<your-feature>.md`, then run the build
> workflow.
>
> **Want to see this spec alongside a complete, retargeted Playbook + build workflow?** The full
> second-domain instance lives in [`../examples/log-analytics/`](../examples/log-analytics/) — that
> spec ([`saved-query-alerts.md`](../examples/log-analytics/specs/saved-query-alerts.md)) is the
> fully-fleshed version of the one below.

Status: approved · Gap #3 · Audience: on-call engineers who re-run the same diagnostic query daily.

## What it answers
- "Alert me when this saved query crosses a threshold, instead of me re-running it by hand."
- "What were the last N times this alert fired, and what was the value?"

## Approved decisions
- **Distribution:** fold into the existing `cli` alerting subcommand group (not a distinct vertical →
  no new top-level command). Re-sync docs.
- **v1 scope:** Lean — threshold + cadence + one notification channel. Defer anomaly detection and
  multi-channel routing.

## Definition of Done
Per the Standing DoD in `FEATURE_PLAYBOOK.md`, retargeted to this product's layers
(`query | api | web | cli` — see `ADAPTING.md`):

- **query** (`packages/query/src/alerts.ts`) — pure, typed evaluator: given a saved query result + a
  threshold rule, returns `{ triggered: boolean, value, comparedAt }`. Reuse the existing
  comparison/operator helpers; never re-implement query parsing. Done when it matches the golden
  fixtures in `__tests__/alerts.test.ts` (90% branch / 100% func).
- **api** (`packages/api`) — `POST /alerts` + `GET /alerts/:id/history` routes, OpenAPI schema
  updated, contract test added. Web and CLI both go through these routes (single source of truth).
- **web** (`apps/web`) — an "Alerts" tab on the saved-query view (progressive disclosure: only shown
  when a query is saved), a history panel, a nav/docs entry. Renders safely with no alerts configured.
- **cli** (`packages/cli`) — `logscope alert add|list|history` subcommands with `--help` text and
  shell completion; folded into the existing alerting command group.
- **Pre-ship verify gate (main loop, non-negotiable):** `node scripts/safe-jest.mjs packages/query`
  + the api contract suite + `npm run build` + `npm run lint`, all green locally, before any merge or
  deploy. Subagent verdicts are advisory only.

## Non-goals (v1)
- Anomaly/baseline detection (threshold only).
- More than one notification channel.
- Editing alerts in bulk.
