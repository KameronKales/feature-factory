# Annotated run trace — one gap, end to end

<sub>[← Docs index](../README.md) · [How it works](../FEATURE_FACTORY.md) · [Safety](../SAFETY.md)</sub>

The other docs describe the loop; this **narrates one real-shaped run** so you'll recognize success
when you see it. The product is the LogScope log-analytics example; the gap is **Saved Query Alerts**.
Outputs referenced here are committed: [`sample-research-gaps-output.json`](sample-research-gaps-output.json)
and [`sample-build-gap-output.json`](sample-build-gap-output.json).

> Annotations are in blockquotes. Everything else is what you'd see happen.

---

**You:** *"Run the feature factory on this repo. Build the top gap, run on a branch."*

> The factory runs inside Claude Code (the "main loop"). It first **arms resilience**.

**Main loop:**
- `git switch -c factory/run-1` — work on a branch, not `main` (per [SAFETY.md](../SAFETY.md)).
- starts `node scripts/keep-awake.mjs 21600` in the background.
- confirms `safe-jest` is wired into the test steps.

> **Step 1 — Research.** It calls the research workflow. This is a tool call the assistant makes for
> you, not a shell command:

```
Workflow({ name: 'research-gaps', args: { root: '/work/logscope', domains: [...], focus: '...', surface: '...' } })
```

> ~8 subagents fan out (one per domain), grep the real code for evidence, and a ranking pass returns a
> structured list. It posts the queue:

```
Ranked gaps (3):
  1. saved-query-alerts   — threshold alerts on saved queries        [lean, fold-in]
  2. query-cost-estimator — pre-run scan/cost estimate               [full, fold-in]
  3. rbac-query-scoping    — per-team query scoping                  [full, new-skill]
```

> That's exactly [`sample-research-gaps-output.json`](sample-research-gaps-output.json). **Nothing has
> been written yet.** You asked for the top gap, so it takes #1.

> **Step 2 — Build the gap.** It writes + commits a spec from the Playbook, then runs the build
> workflow with the gap object as args:

```
Workflow({ name: 'build-gap', args: { slug: 'saved-query-alerts', recommended_tool: 'alerts', ... } })
```

> Inside: Investigate (parallel, read-only) → Synthesize one plan + reference targets + disjoint file
> groups → Implement (**core first**, then `api ∥ web`, then `cli`) → Verify. It returns a report:
> [`sample-build-gap-output.json`](sample-build-gap-output.json) — 11 files touched, plus subagent
> `verdicts`.

> **Step 3 — The pre-ship gate (this is the important part).** The build workflow's `verdicts` are
> *advisory*. The main loop now **re-runs the gate itself, locally** — it does not ship on a subagent's
> word:

```
$ node scripts/safe-jest.mjs packages/query/src/__tests__/alerts   → PASS (96% branch)
$ <api contract + surface-parity suites>                            → PASS
$ <cli integration suite>                                           → PASS
$ npm run build && npm run lint                                     → PASS
```

> One subagent flagged a **minor** advisory issue (history limit not pinned in the spec). The main
> loop surfaces it rather than silently shipping — exactly the "what the AI can get wrong" category
> from [SAFETY.md](../SAFETY.md). Here it's cosmetic, so it commits and notes it.

**Main loop:** commits to `factory/run-1`, then **stops** (you asked to run on a branch):

```
✅ saved-query-alerts — built + verified locally on branch factory/run-1.
   11 files. Gate green. 1 advisory note: pin the /history limit (currently 50).
   Review the diff and open a PR when ready. Remaining queue: 2 gaps (not built).
```

> **Step 4 — You review.** Open the diff, merge the PR yourself (the human checkpoint), and either
> tell it to continue with gap #2 or stop. It tears down resilience (kills keep-awake, deletes any
> watchdog) when the run ends.

---

**What "success" looked like:** a ranked queue you could sanity-check *before* any code, a single gap
built across every layer its Playbook requires, a **locally-verified** green gate (not a subagent's
say-so), honest surfacing of an uncertain spot, and work isolated on a branch for your review.
