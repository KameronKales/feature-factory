# {{PRODUCT_NAME}} Skills

[![Claude Code Agent Skills](https://img.shields.io/badge/Claude%20Code-Agent%20Skills-d97757)](https://docs.claude.com/en/docs/claude-code) [![Powered by MCP](https://img.shields.io/badge/MCP-server-3b82f6)]({{MCP_URL}}) [![License: MIT](https://img.shields.io/badge/License-MIT-22c55e.svg)](./LICENSE) ![Skills](https://img.shields.io/badge/skills-{{COUNT}}-f59e0b)

Open-source [Claude Code](https://docs.claude.com/en/docs/claude-code) Agent Skills powered by the
public **{{PRODUCT_NAME}} MCP** server. Ask in plain English; the skills turn your questions into the
right tool calls. No signup, no API key.

> Replace this paragraph (and the FAQ below) with copy describing *your* product. This file is a
> template — `scripts/sync-skills-catalog.mjs` substitutes the `{{TOKENS}}` and writes the result as the
> catalog repo's README.

## Quick start

**With the [skills.sh](https://skills.sh) CLI:**

```
npx skills add {{CATALOG_REPO}}          # choose from all {{COUNT}}
npx skills add {{CATALOG_REPO}} --all    # install all {{COUNT}}
npx skills add {{ORG}}/{{PREFIX}}<name>            # just one skill (table below)
```

**Or, in [Claude Code](https://docs.claude.com/en/docs/claude-code):**

```
claude plugin marketplace add {{CATALOG_REPO}}
claude mcp add --transport http {{PRODUCT_SLUG}} {{MCP_URL}}
```

## Skills

| Skill | What it does | Install (skills.sh CLI) |
|-------|--------------|-------------------------|
{{SKILL_ROWS}}

## Use it in any MCP client (not just Claude Code)

The engine is a standard [Model Context Protocol](https://modelcontextprotocol.io) server at
`{{MCP_URL}}` (Streamable HTTP). Connect it from any MCP-capable agent and you get the same tools
directly. Most clients take an `mcpServers` config block:

```json
{
  "mcpServers": {
    "{{PRODUCT_SLUG}}": { "type": "http", "url": "{{MCP_URL}}" }
  }
}
```

| Client | How to add it |
|--------|---------------|
| **Claude Code** | `claude mcp add --transport http {{PRODUCT_SLUG}} {{MCP_URL}}` |
| **Cursor** | add the block above to `~/.cursor/mcp.json` (field: `url`) |
| **Windsurf** | `~/.codeium/windsurf/mcp_config.json` (field: `serverUrl`) |
| **Cline / VS Code** | paste the block into the Cline MCP settings |
| **Claude Desktop & stdio-only clients** | bridge with `npx -y mcp-remote {{MCP_URL}}` |
| **Custom / your own agent** | plain MCP Streamable HTTP — POST JSON-RPC `tools/list` / `tools/call` to the URL with `Accept: application/json, text/event-stream` |

---

_Generated from the [`{{MONOREPO_NAME}}`](https://github.com/{{MONOREPO}}) monorepo (source of truth)
and mirrored here — don't edit directly; changes flow via CI._
