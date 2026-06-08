---
name: {{NAME}}
version: 1.0.0
description: {{DESCRIPTION}}
---

# {{NAME}}

A thin orchestration layer over the **{{NAME}} MCP** (public, no auth). All logic lives server-side.
This skill only gathers inputs and calls the tools — it does **not** compute anything locally, carries
no business logic or defaults, and is read-only.

## Step 0 — Make sure the tools are connected

This skill uses these tools (may be namespaced, e.g. `mcp__<server>__<tool>`):
{{TOOLS}}.

If they're NOT available, tell the user to connect the MCP, then continue:

```
claude mcp add --transport http <server-name> <YOUR_MCP_URL>
```

## Step 1 — Gather inputs

Ask only for what the user's question needs. Every input has a sensible server default, so the tools
run cold.

<!-- TODO (author): replace the placeholder Step-N sections below with the real route-by-intent
     orchestration for this skill — one numbered step per tool, naming the REQUIRED args, what the
     tool returns, and which intent maps to it. Keep it thin: gather → call → surface. Use FICTIONAL
     example values only, never a real user's data. -->

## Step 2 — Route by intent (hand-fill per tool)

- **"<intent A>"** → **`<tool_a>`** (REQUIRED `<args>`) → returns `<headline field>`.
- **"<intent B>"** → **`<tool_b>`** (REQUIRED `<args>`) → returns `<headline field>`.
- … one bullet per tool in {{TOOLS}} …

Example (FICTIONAL — illustrate the call shape):

```
<tool_a>({ /* required args */ })
```

## Step 3 — Surface the result

- **Lead with the headline** figure / decision the tool returns.
- **Read back any assumptions** the tool reports (e.g. `disclosures` / `assumed_defaults[]`) so the
  user can correct anything wrong and re-call with overrides.
- **Follow `next_actions[]`** server-suggested chains rather than guessing the next call.

## Notes

- Reuse any session handle/id the server mints rather than re-sending the full input each call.
- Keep the skill thin: gather → call → surface. No local computation.
