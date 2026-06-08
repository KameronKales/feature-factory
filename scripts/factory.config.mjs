// Central config for the feature-factory distribution scripts.
//
// IMPORTANT: there are NO baked-in project defaults for push targets (org, catalog
// repo, etc.). That's deliberate — a fresh clone CANNOT accidentally push to
// someone else's repos. You MUST provide config before any publish/sync runs.
//
// Provide config two ways (env wins over file):
//   1. scripts/factory.config.json  (copy scripts/factory.config.example.json)
//   2. environment variables (FACTORY_ORG, FACTORY_CATALOG_REPO, …)
//
// Only the push-target identity is required (and only when a script actually needs
// it); cosmetic fields fall back to neutral, non-pushing placeholders.

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))

// Load the JSON config file if present (path overridable via FACTORY_CONFIG).
const cfgPath = process.env.FACTORY_CONFIG || join(__dirname, 'factory.config.json')
let file = {}
if (fs.existsSync(cfgPath)) {
  try { file = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) } catch (e) {
    throw new Error(`feature-factory: could not parse ${cfgPath}: ${e.message}`)
  }
}

const val = (envKey, fileKey, fallback) => process.env[envKey] ?? file[fileKey] ?? fallback
// `required` throws ONLY when the value is read — so scaffolding that doesn't push
// never trips on a missing catalog repo, etc.
const required = (label, v) => {
  if (v === undefined || v === null || v === '') {
    throw new Error(
      `feature-factory config: "${label}" is required but not set. Add it to ${cfgPath} ` +
      `(see scripts/factory.config.example.json) or pass it via env. No default is provided ` +
      `on purpose, so a clone can't accidentally push to the wrong repo.`,
    )
  }
  return v
}

// Repo root (where skills/ and .claude-plugin/ live) — safe local default.
export const ROOT = val('FACTORY_ROOT', 'root', resolve(__dirname, '..'))

// --- Push-target identity: REQUIRED, no default (read lazily via getters) ---
export const ORG = required('org', val('FACTORY_ORG', 'org'))
export const CATALOG_REPO = required('catalogRepo', val('FACTORY_CATALOG_REPO', 'catalogRepo'))

// Repo-name prefix for per-skill repos (e.g. "myproj-"). Default "" (no prefix).
export const SKILL_REPO_PREFIX = val('FACTORY_SKILL_REPO_PREFIX', 'skillRepoPrefix', '')

// --- Cosmetic fields: neutral fallbacks (never a push target) ---
export const MONOREPO = val('FACTORY_MONOREPO', 'monorepo', ORG ? `${ORG}/monorepo` : 'your-org/monorepo')
export const PRODUCT_NAME = val('FACTORY_PRODUCT_NAME', 'productName', 'the')
export const MCP_URL = val('FACTORY_MCP_URL', 'mcpUrl', '')
export const GIT_NAME = val('SYNC_GIT_NAME', 'gitName', 'skill-sync')
export const GIT_EMAIL = val('SYNC_GIT_EMAIL', 'gitEmail', 'noreply@example.com')
export const AUTHOR = {
  name: val('FACTORY_AUTHOR_NAME', 'authorName', ORG),
  url: val('FACTORY_AUTHOR_URL', 'authorUrl', `https://github.com/${ORG}`),
}

export const defaultDesc = (name) =>
  val('FACTORY_DEFAULT_DESC', 'defaultDesc', `Thin orchestration over the public ${PRODUCT_NAME} MCP for the ${name} skill.`)

// Skills whose public repo name / commit label differs from the convention
// (repo = <ORG>/<PREFIX><name>, label = <name>). Default: none.
export const LEGACY_REPOS = (() => {
  const fromEnv = process.env.FACTORY_LEGACY_REPOS
  if (fromEnv) return JSON.parse(fromEnv)
  return file.legacyRepos || {}
})()

// Resolve a skill name -> { repo, label } for its public distribution repo.
export const repoFor = (name) =>
  LEGACY_REPOS[name] || { repo: `${ORG}/${SKILL_REPO_PREFIX}${name}`, label: name }

// Map a skill name -> its public repo slug (the part after the org), honoring legacy names.
export const repoSlug = (name) => repoFor(name).repo.split('/')[1]

// Shared "use it in any MCP client" footer appended to every public repo README.
export const mcpFooter = () => `## Use it in any MCP client (not just Claude Code)

This skill is Claude Code packaging — but the engine is a standard
[Model Context Protocol](https://modelcontextprotocol.io) server at
\`${MCP_URL}\` (Streamable HTTP, no auth). Connect it from any
MCP-capable agent and you get the same ${PRODUCT_NAME} tools directly. Every tool is
**self-orchestrating** (it reports its own assumed defaults and suggests the
next step), so it works well even without the skill wrapper.

Most clients take an \`mcpServers\` config block:

\`\`\`json
{
  "mcpServers": {
    "${PRODUCT_NAME.toLowerCase()}": { "type": "http", "url": "${MCP_URL}" }
  }
}
\`\`\`

| Client | How to add it |
|--------|---------------|
| **Claude Code** | \`claude mcp add --transport http ${PRODUCT_NAME.toLowerCase()} ${MCP_URL}\` |
| **Cursor** | add the block above to \`~/.cursor/mcp.json\` (field: \`url\`) |
| **Windsurf** | \`~/.codeium/windsurf/mcp_config.json\` (field: \`serverUrl\`) |
| **Cline / VS Code** | paste the block into the Cline MCP settings |
| **Claude Desktop & stdio-only clients** | bridge with \`npx -y mcp-remote ${MCP_URL}\` |
| **ChatGPT (custom connectors / Deep Research)** | add a connector pointing at the MCP URL |
| **Custom / your own agent** | plain MCP Streamable HTTP — POST JSON-RPC \`tools/list\` / \`tools/call\` to the URL with \`Accept: application/json, text/event-stream\` |

Field names vary slightly by client and version — check your client's MCP docs;
the URL is always \`${MCP_URL}\`.
`
