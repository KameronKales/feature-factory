# Spec: Saved Query Alerts

Status: approved · Gap #3 · Audience: on-call engineers who re-run the same diagnostic query daily.

> A fully-filled spec written from the LogScope playbook
> ([`../FEATURE_PLAYBOOK.md`](../FEATURE_PLAYBOOK.md)). This is what the factory would commit as
> `docs/specs/saved-query-alerts.md` before running the build workflow.

## What it answers
- "Alert me when this saved query crosses a threshold, instead of me re-running it by hand."
- "What were the last N times this alert fired, and what value tripped it?"

## Approved decisions
- **Distribution:** fold into the existing `logscope alert` command group (not a distinct top-level
  workflow → no new command group). Re-sync the CLI reference docs.
- **v1 scope:** Lean — threshold rule + cadence + one notification channel. Defer anomaly/baseline
  detection and multi-channel routing.

## Definition of Done
Per the Standing DoD in the playbook, for layers `query · api · web · cli`:

- **query** (`packages/query/src/alerts.ts`) — pure, typed evaluator: given a saved query result + a
  threshold rule (`{ op, value }`), returns `{ triggered, observed, comparedAt }`. Reuse the existing
  operator table + `TimeRange`; the saved query runs through the `QueryPlan` pipeline so retention +
  ACL are honored (no direct store read). Notifications dispatch through `NotificationChannel` from the
  single evaluator, so scheduled runs, manual re-runs, and backfills all notify identically. Done when
  it matches the golden-query fixtures in `__tests__/alerts.test.ts` (90% branch / 100% func), incl.
  empty-result-set and retention-boundary cases.
- **api** (`packages/api`) — `POST /alerts` (create) + `GET /alerts/:id/history` routes; OpenAPI schema
  updated; contract test added; new `alert_rule_invalid` code registered in `errors.ts`. Web and CLI both
  call these routes — asserted in `test/surface-parity.test.ts`.
- **web** (`apps/web`) — an "Alerts" tab on the saved-query view (progressive disclosure: shown only
  when a query is saved), a fire-history panel mirroring `SavedQueryPanel`, and a nav + docs-page entry.
  Renders safely with no alerts configured (mount test: empty state, no throw).
- **cli** (`packages/cli`) — `logscope alert add|list|history` subcommands calling the routes, with
  `--help` text, examples, and shell completion; folded into the existing `alert` group; CLI reference
  docs updated. CLI integration test drives the commands against a fake API and asserts output + exit code.
- **Pre-ship verify gate (main loop, non-negotiable):** `node scripts/safe-jest.mjs packages/query/src/__tests__/alerts`
  + the api contract + surface-parity suites + the CLI integration suite + `npm run build` + `npm run lint`,
  all green locally, before any publish/tag/deploy. Subagent verdicts are advisory only.

## Non-goals (v1)
- Anomaly/baseline detection (threshold only).
- More than one notification channel.
- Bulk-editing alerts.
