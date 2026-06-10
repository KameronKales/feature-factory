#!/usr/bin/env node
// Scaffold a new skill from templates/skill/** into skills/<name>/**,
// register it in the marketplace catalog, and optionally publish it.
// OS-INDEPENDENT Node port of the old scripts/new-skill.sh (no bash/jq/sed/date).
//
// Usage:
//   node scripts/new-skill.mjs <name> [--publish] [--desc "..."] [--tools "a,b,c"]
//
//   <name>      lowercase kebab-case (^[a-z][a-z0-9-]+$)
//   --desc      one-line description (frontmatter + plugin + marketplace + README)
//   --tools     comma-separated tool list rendered into SKILL.md's {{TOOLS}}
//   --publish   gh repo create <org>/<prefix><name> --public, then sync
//
// Idempotent: if skills/<name> already exists, the scaffold is SKIPPED (never
// clobbers an authored SKILL.md); only the marketplace entry is ensured.

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import fs from 'node:fs'
import { ROOT, getOrg, SKILL_REPO_PREFIX, AUTHOR, defaultDesc } from './factory.config.mjs'

function die(msg, code = 1) { console.error(msg); process.exit(code) }

const USAGE = `new-skill — scaffold a skill from templates/skill, register it in the marketplace, optionally publish.

Usage:
  node scripts/new-skill.mjs <name> [--publish] [--desc "..."] [--tools "a,b,c"] [--dry-run]

  <name>      lowercase kebab-case (^[a-z][a-z0-9-]+$)
  --desc      one-line description (frontmatter + plugin + marketplace + README)
  --tools     comma-separated tool list rendered into SKILL.md's {{TOOLS}}
  --publish   gh repo create <org>/<prefix><name> --public, then sync (needs gh + config)
  --dry-run   print what would happen; write nothing, create no repo, push nothing
  --help      show this help
`

// --- parse args ---
const argv = process.argv.slice(2)
if (argv.includes('--help') || argv.includes('-h')) { process.stdout.write(USAGE); process.exit(0) }
const NAME = argv[0] && !argv[0].startsWith('--') ? argv[0] : ''
let PUBLISH = false, DESC = '', TOOLS = '', DRY = false
for (let i = NAME ? 1 : 0; i < argv.length; i++) {
  if (argv[i] === '--publish') PUBLISH = true
  else if (argv[i] === '--dry-run') DRY = true
  else if (argv[i] === '--desc') DESC = argv[++i] || ''
  else if (argv[i] === '--tools') TOOLS = argv[++i] || ''
  else die(`Unknown arg: ${argv[i]}`, 2)
}
if (!NAME) die('Usage: node scripts/new-skill.mjs <name> [--publish] [--desc "..."] [--tools "a,b,c"]', 2)
if (!/^[a-z][a-z0-9-]+$/.test(NAME)) die(`✗ Invalid name '${NAME}' — must match ^[a-z][a-z0-9-]+$ (lowercase kebab-case).`, 2)

const TPL = join(ROOT, 'templates/skill')
const SKILL_DIR = join(ROOT, 'skills', NAME)
const MARKET = join(ROOT, '.claude-plugin/marketplace.json')
// org is REQUIRED only to --publish; for local scaffolding the {{REPO}} placeholder
// best-efforts it (so a no-config clone can still scaffold without throwing).
const resolveOrg = (requireIt) => {
  try { return getOrg() } catch (e) { if (requireIt) throw e; return 'your-org' }
}
// org is required only for a REAL publish; a dry-run preview uses a placeholder.
const REPO = `${resolveOrg(PUBLISH && !DRY)}/${SKILL_REPO_PREFIX}${NAME}`
const YEAR = String(new Date().getFullYear())
if (!DESC) DESC = defaultDesc(NAME)

const TOOLS_RENDERED = TOOLS
  ? '`' + TOOLS.replace(/\s/g, '').replace(/,/g, '`, `') + '`'
  : '(list the tools this skill calls)'

if (!fs.existsSync(TPL)) die(`✗ Template dir not found at ${TPL}`)

const render = (src, dst) => {
  const out = fs.readFileSync(src, 'utf8')
    .replaceAll('{{NAME}}', NAME)
    .replaceAll('{{REPO}}', REPO)
    .replaceAll('{{YEAR}}', YEAR)
    .replaceAll('{{DESCRIPTION}}', DESC)
    .replaceAll('{{TOOLS}}', TOOLS_RENDERED)
  fs.writeFileSync(dst, out)
}

if (fs.existsSync(SKILL_DIR)) {
  console.log(`• skills/${NAME} already exists — skipping scaffold (will not clobber authored files).`)
} else if (DRY) {
  console.log(`[dry-run] would scaffold skills/${NAME}/ (SKILL.md, README.md, .claude-plugin/plugin.json, LICENSE) from templates/skill`)
} else {
  console.log(`→ Scaffolding skills/${NAME} from templates/skill`)
  fs.mkdirSync(join(SKILL_DIR, '.claude-plugin'), { recursive: true })
  render(join(TPL, 'SKILL.md'), join(SKILL_DIR, 'SKILL.md'))
  render(join(TPL, 'README.md'), join(SKILL_DIR, 'README.md'))
  render(join(TPL, '.claude-plugin/plugin.json'), join(SKILL_DIR, '.claude-plugin/plugin.json'))
  render(join(TPL, 'LICENSE'), join(SKILL_DIR, 'LICENSE'))
}

// Marketplace registration. Skipped ENTIRELY in dry-run — --dry-run must write nothing.
if (DRY) {
  console.log(`[dry-run] would ensure '${NAME}' is registered in .claude-plugin/marketplace.json`)
} else {
  // Seed the manifest if a fresh clone doesn't have one yet (avoids a raw ENOENT).
  // Name matches the marketplace this repo ships (.claude-plugin/marketplace.json) so a
  // regenerate can't silently diverge from the committed file; override via FACTORY_MARKETPLACE_NAME.
  if (!fs.existsSync(MARKET)) {
    fs.mkdirSync(join(ROOT, '.claude-plugin'), { recursive: true })
    const marketName = process.env.FACTORY_MARKETPLACE_NAME || 'feature-factory'
    fs.writeFileSync(MARKET, JSON.stringify({ name: marketName, plugins: [] }, null, 2) + '\n')
  }
  // Idempotently ensure a marketplace plugins[] entry (append only if absent).
  const market = JSON.parse(fs.readFileSync(MARKET, 'utf8'))
  if ((market.plugins || []).some((p) => p.name === NAME)) {
    console.log(`• marketplace.json already lists '${NAME}'.`)
  } else {
    console.log(`→ Adding '${NAME}' to .claude-plugin/marketplace.json`)
    market.plugins = market.plugins || []
    market.plugins.push({
      name: NAME,
      source: `./skills/${NAME}`,
      description: DESC,
      version: '1.0.0',
      license: 'MIT',
      author: { ...AUTHOR },
    })
    fs.writeFileSync(MARKET, JSON.stringify(market, null, 2) + '\n')
  }
}

if (PUBLISH && DRY) {
  console.log(`[dry-run] would: gh repo create ${REPO} --public (if absent), then sync skills/${NAME} → ${REPO}. No repo created, no push.`)
} else if (PUBLISH) {
  const sh = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: process.platform === 'win32' })
  const ok = (cmd, args) => { try { execFileSync(cmd, args, { stdio: 'ignore', shell: process.platform === 'win32' }); return true } catch { return false } }
  if (!ok('gh', ['--version'])) die('✗ --publish needs the gh CLI.')
  if (!ok('gh', ['auth', 'status'])) die("✗ gh not authed — run 'gh auth login'.")
  if (ok('gh', ['repo', 'view', REPO])) {
    console.log(`• ${REPO} already exists — skipping create.`)
  } else {
    console.log(`→ Creating public repo ${REPO}`)
    sh('gh', ['repo', 'create', REPO, '--public'])
  }
  console.log('→ Publishing via sync')
  sh(process.execPath, [join(ROOT, 'scripts/sync-skill.mjs'), NAME])
}

console.log(`
Next steps:
  1. Edit skills/${NAME}/SKILL.md — fill in the route-by-intent tool orchestration
     (one step per tool) and a FICTIONAL example. Keep it thin: gather → call → surface.
  2. Verify each referenced tool exists in workers/ai-mcp/src/tool-names.ts.
  3. Run scoped tests (NEVER bare 'npx jest' — it hangs):
       node scripts/safe-jest.mjs <path>
       node scripts/safe-jest.mjs --worker
  4. Commit, then sync:  npm run sync:skill ${NAME}   (or re-run with --publish)`)
