# Feature Factory — docs index

Start at the top and work down; that's the intended reading order. (Repo overview: the
[root README](../README.md).)

## Read in order

1. **[QUICKSTART.md](QUICKSTART.md)** — clone → verify → a real research-only first run in ~10 min.
   Defines the runtime before anything else.
2. **[FEATURE_FACTORY.md](FEATURE_FACTORY.md)** — how it works: the loop, the four-layer build model,
   and what makes it survive an unattended run (with diagrams).
3. **[ADAPTING.md](ADAPTING.md)** — point the factory at *your* (non-finance) product: the 3-step
   adaptation, what to change vs leave alone, and a worked example.
4. **[FEATURE_PLAYBOOK.md](FEATURE_PLAYBOOK.md)** — the Definition of Done every gap ships to (finance
   example). Blank template: **[FEATURE_PLAYBOOK.generic.md](FEATURE_PLAYBOOK.generic.md)**.

## Reference

- **[GLOSSARY.md](GLOSSARY.md)** — *gap*, *main loop*, *workflow*, *self-orchestrating*, *MCP*, … all
  defined. Read this if any term trips you up.
- **[SAFETY.md](SAFETY.md)** — cost, what runs unsupervised, how to bound/stop a run, and what the AI
  can get wrong. **Read before your first real (code-writing) run.**
- **[TROUBLESHOOTING.md](TROUBLESHOOTING.md)** — symptom → cause → fix when a run stalls, rate-limits,
  or errors.

## Examples & templates

- **[specs/EXAMPLE.md](specs/EXAMPLE.md)** — a filled-in feature spec (the first concrete deliverable
  of a build).
- **[examples/](examples/)** — worked end-to-end instances:
  - **[examples/log-analytics/](examples/log-analytics/)** — the finance harness fully retargeted to a
    log-analytics SaaS (its own Playbook + build workflow + spec).
  - **[examples/npm-library/](examples/npm-library/)** — a minimal single-package, no-UI shape (proves
    the pattern scales *down*).
  - **[examples/sample-research-gaps-output.json](examples/sample-research-gaps-output.json)** /
    **[sample-build-gap-output.json](examples/sample-build-gap-output.json)** — realistic workflow outputs.
  - **[examples/run-trace.md](examples/run-trace.md)** — an annotated transcript of one full run.
- **[build-gap.generic.js](build-gap.generic.js)** — a domain-neutral starting point for the build
  workflow (validate a customized copy with `node scripts/validate-build-gap.mjs`).

## Contributing to the harness itself

See **[../CONTRIBUTING.md](../CONTRIBUTING.md)**.
