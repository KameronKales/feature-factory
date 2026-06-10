# Quickstart — your first run in ~10 minutes

<sub>[← Docs index](README.md) · next: [How it works](FEATURE_FACTORY.md) · [Glossary](GLOSSARY.md)</sub>

This gets you from a fresh clone to a **real (research-only) run** that builds nothing — the safest
way to see the factory work before you let it write code. If you've never seen this pattern, read the
["What is a Workflow?"](#what-is-a-workflow) section first.

## What is a Workflow?

The factory runs **inside [Claude Code](https://docs.claude.com/en/docs/claude-code)** — that's the
runtime. There is no separate daemon or server. Two pieces do the work:

- **The assistant (the "main loop")** — Claude Code itself, following the orchestration in
  `skills/feature-factory/SKILL.md` when you say *"run the feature factory."*
- **Workflows** — the `.js` files in `.claude/workflows/`. A workflow is a deterministic script that
  fans out parallel AI subagents and returns structured data. The assistant invokes one with the
  **`Workflow` tool**, e.g. `Workflow({ name: 'research-gaps', args: {…} })`. Claude Code auto-discovers
  any `.claude/workflows/*.js` in the repo by its `meta.name`, so `name: 'research-gaps'` resolves to
  `.claude/workflows/research-gaps.js`.

So everywhere the docs show `Workflow({ name, args })`, that's **the assistant calling a tool for
you** — you don't run it from a shell. You trigger the whole thing in plain language.

## 1. Clone + check prerequisites

```
git clone <this-repo> feature-factory
cd feature-factory
node --version        # need >= 18
npm --version
git --version
gh --version          # ONLY needed if you'll publish skills; skip otherwise
```

The harness has **zero npm dependencies** (it's 100% Node built-ins), so there's nothing to
`npm install` for the factory itself. (Your *target product* will have its own deps.)

## 2. Verify the harness is healthy

Run the factory's own gate — the same one CI runs:

```
npm run check        # parse-checks every helper script
npm test             # runs the harness test suite (node --test)
```

Both should pass. If they don't, stop here — something's off with your Node version or the clone.

## 3. Configure — probably skip this

By default the factory runs in **`in-repo` mode**: it builds features into *your* repo and publishes
nothing, so **no config file is needed** — point it at your repo and go. Most adopters never touch
config.

You only need a config file for **`skills` mode** (publishing skills to public repos + a catalog):

```
cp scripts/factory.config.example.json scripts/factory.config.json
# edit it: set distributionMode: "skills", plus org and catalogRepo
```

There are deliberately **no default push targets** — the sync/publish scripts refuse to run until
`org` + `catalogRepo` are set, so a clone can never push to someone else's repos. See the
[README config table](../README.md#configuration-keys) for every key.

## 4. Your first run — research only, build nothing

In Claude Code, open this repo (or your target product) and say:

> Run the feature factory in **research-only** mode against this repo — surface the ranked gap list
> but **do not build anything**. Focus: <whatever you care about>.

The assistant will call `research-gaps`, which fans out one auditor per domain, greps the real
codebase for evidence, and returns a ranked, build-ready gap list. **Nothing is written or shipped** —
you just see what it would propose. (Under the hood that's
`Workflow({ name: 'research-gaps', args: { root, domains, focus, surface } })`; you can also state
those args in your message.)

Review the list. This is your chance to calibrate before any code is written.

## 5. Build a gap (when you're ready)

> **Before a code-writing run, read [`SAFETY.md`](SAFETY.md).** A build run commits, pushes, and can
> deploy *without asking* — bound the blast radius (run on a branch, cap to one gap, review the diff
> before merge) and know the cost first.

Pick one gap and tell the assistant to build it. For a **non-finance product, first adapt the build
workflow** — see [`ADAPTING.md`](ADAPTING.md), because the shipped `build-gap.js` is a finance
example. For *this* repo (the harness itself) there's no product to build into, so stay in
research-only mode and act on findings manually.

The main loop will: write + commit a spec from [`FEATURE_PLAYBOOK.md`](FEATURE_PLAYBOOK.md) → run
`build-gap` → **re-run the tests/build/lint locally itself** (the non-negotiable pre-ship gate, see
[`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) if a run stalls) → ship → take the next gap.

## Where to go next

- [`ADAPTING.md`](ADAPTING.md) — point the factory at your own (non-finance) product.
- [`FEATURE_FACTORY.md`](FEATURE_FACTORY.md) — the full architecture.
- [`FEATURE_PLAYBOOK.md`](FEATURE_PLAYBOOK.md) — the Definition of Done every gap ships to.
- [`TROUBLESHOOTING.md`](TROUBLESHOOTING.md) — when a run stalls, rate-limits, or errors.
