#!/usr/bin/env node
// Mirror ALL skills into a single public catalog repo (config.CATALOG_REPO).
// OS-INDEPENDENT pure-Node script (no bash/rsync/jq/perl/mktemp).
//
// Differs from sync-skill.mjs (per-skill, single-plugin): this carries the WHOLE
// skills/ tree + the FULL marketplace.json + a generated catalog README.
//
// Auth: CI sets CATALOG_SYNC_TOKEN (or SKILL_SYNC_TOKEN); local falls back to gh.
// Usage: node scripts/sync-skills-catalog.mjs

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { ROOT as SRC, getCatalogRepo, getOrg, MONOREPO, MCP_URL, SKILL_REPO_PREFIX, PRODUCT_NAME, repoSlug, GIT_NAME, GIT_EMAIL } from './factory.config.mjs'

const WIN = process.platform === 'win32'
const die = (m, c = 1) => { console.error(m); process.exit(c) }
const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit', shell: WIN })
const out = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', shell: WIN }).trim()
const ok = (cmd, args) => { try { execFileSync(cmd, args, { stdio: 'ignore', shell: WIN }); return true } catch { return false } }

// This is a PUSH script, so the org + catalog repo are genuinely required here.
const ORG = getOrg()
const CATALOG_REPO = getCatalogRepo()
const SRC_MARKET = join(SRC, '.claude-plugin/marketplace.json')
if (!fs.existsSync(SRC_MARKET)) {
  die(`No ${SRC_MARKET}. Create it ({"plugins":[]}) or scaffold a skill first (npm run new:skill <name>).`)
}
const DRY = process.argv.slice(2).includes('--dry-run')
const PUB_REPO = CATALOG_REPO
const SHA = out('git', ['-C', SRC, 'rev-parse', '--short', 'HEAD'])
if (DRY) {
  const n = (JSON.parse(fs.readFileSync(SRC_MARKET, 'utf8')).plugins || []).length
  console.log(`[dry-run] would sync ${n} skill(s) (${MONOREPO}@${SHA}) → https://github.com/${PUB_REPO} (HEAD:main). No clone, no push.`)
  process.exit(0)
}
const TMP = fs.mkdtempSync(join(os.tmpdir(), 'catalog-sync-'))
process.on('exit', () => { try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* noop */ } })

console.log(`→ Syncing ALL skills from ${MONOREPO}@${SHA} to ${PUB_REPO}`)

const TOKEN = process.env.CATALOG_SYNC_TOKEN || process.env.SKILL_SYNC_TOKEN
let PUSH_URL = ''
if (TOKEN) {
  run('git', ['clone', '--depth', '1', `https://github.com/${PUB_REPO}.git`, TMP, '-q'])
  PUSH_URL = `https://x-access-token:${TOKEN}@github.com/${PUB_REPO}.git`
} else {
  if (!ok('gh', ['--version'])) die('Need CATALOG_SYNC_TOKEN/SKILL_SYNC_TOKEN or gh.')
  run('gh', ['repo', 'clone', PUB_REPO, TMP, '--', '--depth', '1', '-q'])
}

// Mirror the skills tree (delete-extra), EXCLUDING feature-factory (internal build
// tool — never published to the public catalog).
const destSkills = join(TMP, 'skills')
fs.rmSync(destSkills, { recursive: true, force: true })
fs.cpSync(join(SRC, 'skills'), destSkills, {
  recursive: true,
  filter: (s) => {
    const rel = s.slice(join(SRC, 'skills').length).replace(/\\/g, '/')
    return rel !== '/feature-factory' && !rel.startsWith('/feature-factory/')
  },
})
fs.mkdirSync(join(TMP, '.claude-plugin'), { recursive: true })
fs.copyFileSync(SRC_MARKET, join(TMP, '.claude-plugin/marketplace.json'))
// Catalog LICENSE: use the repo-root LICENSE (project-agnostic) rather than a hardcoded
// per-skill path. Skip if the project ships no root LICENSE.
if (fs.existsSync(join(SRC, 'LICENSE'))) {
  fs.copyFileSync(join(SRC, 'LICENSE'), join(TMP, 'LICENSE'))
}

// Generate the catalog README from marketplace.json.
const market = JSON.parse(fs.readFileSync(SRC_MARKET, 'utf8'))
const COUNT = (market.plugins || []).length
const skillRows = (market.plugins || []).map((p) => {
  const slug = repoSlug(p.name)
  const desc = (p.description || '').replace(/ Thin orchestration over the .* MCP\.$/, '')
  return `| [**${p.name}**](https://github.com/${ORG}/${slug}) | ${desc} | \`npx skills add ${ORG}/${slug}\` |`
}).join('\n')

// README body lives in scripts/catalog-readme.template.md (data, not code) so it can be
// swapped per project without touching this script. Tokens are substituted below.
const tplPath = join(SRC, 'scripts/catalog-readme.template.md')
const productSlug = PRODUCT_NAME.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const tokens = {
  COUNT: String(COUNT), MCP_URL, CATALOG_REPO, ORG, PREFIX: SKILL_REPO_PREFIX,
  PRODUCT_NAME, PRODUCT_SLUG: productSlug, MONOREPO, MONOREPO_NAME: MONOREPO.split('/').pop(),
  SKILL_ROWS: skillRows,
}
let readme = fs.readFileSync(tplPath, 'utf8').replace(/\{\{(\w+)\}\}/g, (m, k) => (k in tokens ? tokens[k] : m))

// Keep any remaining prose "all N" counts in lockstep with the dynamic count.
readme = readme.replace(/all \d+/g, `all ${COUNT}`)
fs.writeFileSync(join(TMP, 'README.md'), readme)

if (!out('git', ['-C', TMP, 'status', '--porcelain'])) {
  console.log('✓ catalog already up to date.')
  process.exit(0)
}
run('git', ['-C', TMP, 'add', '-A'])
run('git', ['-C', TMP, '-c', `user.name=${GIT_NAME}`, '-c', `user.email=${GIT_EMAIL}`,
  'commit', '-q', '-m', `Sync skills catalog from ${MONOREPO}@${SHA}`])
if (PUSH_URL) run('git', ['-C', TMP, 'push', '-q', PUSH_URL, 'HEAD:main'])
else run('git', ['-C', TMP, 'push', '-q', 'origin', 'HEAD:main'])
console.log(`✓ Synced catalog to https://github.com/${PUB_REPO}`)
