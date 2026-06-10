---
name: {{NAME}}
version: 1.0.0
description: {{DESCRIPTION}}
---

# {{NAME}}

<!-- LOCAL-MODE template: for a skill whose logic is local, or a thin layer over your OWN
     CLI / REST API / library — NOT an MCP server. If you actually wrap a public MCP server,
     regenerate with the default mode (drop `--mode local`). -->

A skill that {{DESCRIPTION}}. It gathers what the task needs, performs (or invokes) the work,
and surfaces the result. Keep it focused: one clear job, done well.

## Step 0 — Prerequisites

This skill relies on:
{{TOOLS}}.

<!-- TODO (author): list what must be present for this skill to work — a CLI on PATH, an
     env var / credential, a config file, a built binary, etc. If something is missing, tell
     the user how to get it before continuing. -->

## Step 1 — Gather inputs

Ask only for what the task needs; assume sensible defaults for the rest and read them back so
the user can correct them.

## Step 2 — Do the work

<!-- TODO (author): one numbered step per action. Name the REQUIRED inputs, the command/call
     you make (e.g. `yourtool do <args>` or a function call), and what it returns. Use FICTIONAL
     example values only — never a real user's data. -->

- **"<intent A>"** → run `<command-or-call>` (REQUIRED `<args>`) → produces `<result>`.
- **"<intent B>"** → run `<command-or-call>` (REQUIRED `<args>`) → produces `<result>`.

Example (FICTIONAL — illustrate the shape):

```
<command-or-call> --example value
```

## Step 3 — Surface the result

- **Lead with the headline** outcome.
- **Read back the assumptions / defaults** you used so the user can correct and re-run.
- **Suggest the natural next step** rather than guessing it.

## Notes

- Keep the skill thin and deterministic. If logic is non-trivial, it belongs in your product,
  not duplicated here — the skill should orchestrate, not re-implement.
