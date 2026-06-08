# Feature Factory 🏭

**An autonomous "research → build → ship" loop for [Claude Code](https://docs.claude.com/en/docs/claude-code).**

Point it at a product and it will find the highest-value gaps, then build and ship each one
**end-to-end** — engine, tests, UI, API/MCP, distribution, and a homepage update — to a fixed
Definition of Done, completely hands-off (yes, overnight).

It's not a prompt. It's a small, opinionated harness: two saved workflows + a resilience layer that
keeps an unattended run alive and honest.

```
research-gaps  ─▶  structured gap list  ─▶  build-gap (per gap)  ─▶  ship  ─▶  repeat
                         (ranked)            engine·tests·UI·API·dist
```

## What makes it actually run unattended
- **🧪 Hang-proof tests** — `safe-jest`: a hard wall-clock timeout + `--forceExit --runInBand`, so a
  stuck test can never silently block the run (a real failure is distinguishable from a hang).
- **☕ Keep-awake** — `keep-awake.mjs` so the machine doesn't sleep and pause the work (OS-independent:
  `caffeinate` on macOS, `SetThreadExecutionState` on Windows, `systemd-inhibit` on Linux).
- **⏰ Self-healing watchdog** — a recurring check that detects a stalled build, **verifies the code
  itself**, and continues; backs off on token rate-limits instead of hammering; flags anything it
  can't safely do and moves on; cleans itself up when finished.
- **📋 A real Definition of Done** — every feature ships the same way (see the Feature Playbook):
  reusable engine + reference-validated tests, UI wired into the product, a self-orchestrating API,
  distribution, and a homepage update. No half-features marked "done."
- **🔔 Progress updates** — posts to your chat channel at each milestone so you can keep tabs.

## Use it
```
/feature-factory          # or: "run the feature factory" / "find the gaps and ship them"
```
Optional: how many to build, a focus area, slugs to exclude, an updates channel.

## Adapt it
The harness is generic; the specifics live in files you own:
- `.claude/workflows/research-gaps.js` — how gaps are discovered + ranked for your product
- `.claude/workflows/build-gap.js` — the 4-phase build (engine → API ∥ UI → distribution)
- `docs/FEATURE_PLAYBOOK.md` — your Definition of Done
- `scripts/safe-jest.mjs` — the hang-proof test runner
- `scripts/keep-awake.mjs` — the OS-independent keep-awake

Swap in your own research heuristics and DoD; the resilience + orchestration stay.

## Cross-platform
The whole system is **Node.js** — no bash, no platform-specific tools. Helpers are `.mjs` scripts run
as `node scripts/<x>.mjs`; the only external CLIs are `node`, `npm`, `git`, and `gh` (publishing), all
of which run on Windows, macOS, and Linux. Anyone can clone and run it regardless of OS.

> Built for [your product](https://your product.app) to scale its financial-planning toolset — open-sourced as a
> pattern for anyone running Claude Code as an autonomous engineer.

_MIT. Keep secrets (webhooks/tokens) in config — never in shared files._
