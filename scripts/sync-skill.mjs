#!/usr/bin/env node
// Sync ONE skill from this monorepo (source of truth) to its public
// distribution repo. OS-INDEPENDENT Node port of scripts/sync-skill.sh
// (no bash/rsync/jq/awk/mktemp).
//
// Usage: node scripts/sync-skill.mjs <name>   (or: npm run sync:skill <name>)
//
// Mirrors:
//   skills/<name>/**                -> skills/<name>/**
//   .claude-plugin/marketplace.json -> .claude-plugin/marketplace.json (filtered to <name>)
//   skills/<name>/README.md         -> README.md   (repo landing + shared MCP footer)
//   skills/<name>/LICENSE           -> LICENSE
//
// Auth:
//   - CI: set SKILL_SYNC_TOKEN (fine-grained PAT, contents:write on the public repo).
//   - Local: falls back to `gh` auth (run `gh auth login` first).

import { execFileSync } from 'node:child_process'
import { join } from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import { ROOT as SRC, repoFor, mcpFooter, GIT_NAME, GIT_EMAIL, MONOREPO } from './factory.config.mjs'

const WIN = process.platform === 'win32'
const die = (m, c = 1) => { console.error(m); process.exit(c) }
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: 'inherit', shell: WIN, ...opts })
const out = (cmd, args, opts = {}) => execFileSync(cmd, args, { encoding: 'utf8', shell: WIN, ...opts }).trim()
const ok = (cmd, args) => { try { execFileSync(cmd, args, { stdio: 'ignore', shell: WIN }); return true } catch { return false } }

const ARGS = process.argv.slice(2)
if (ARGS.includes('--help') || ARGS.includes('-h')) {
  process.stdout.write(`sync-skill — mirror ONE skill to its public distribution repo.

Usage:
  node scripts/sync-skill.mjs <name> [--dry-run]   (or: npm run sync:skill <name>)

  --dry-run   print what would be pushed and exit (no clone, no push)
  --help      show this help

Requires config (org) + auth: SKILL_SYNC_TOKEN, or the gh CLI authed (\`gh auth login\`).
`)
  process.exit(0)
}
const DRY = ARGS.includes('--dry-run')
const NAME = ARGS.find((a) => !a.startsWith('--'))
if (!NAME) die('Usage: node scripts/sync-skill.mjs <name> [--dry-run]\n  e.g. node scripts/sync-skill.mjs my-skill', 2)

// Name -> public repo + commit-message label (legacy quirks live in the config).
// org is only needed for a real push; a dry-run preview tolerates it being unset.
let PUB_REPO, LABEL
try { ({ repo: PUB_REPO, label: LABEL } = repoFor(NAME)) }
catch (e) { if (!DRY) throw e; PUB_REPO = `<unconfigured-org>/${NAME}`; LABEL = NAME }

const SKILL_DIR = `skills/${NAME}`
if (!fs.existsSync(join(SRC, SKILL_DIR, 'SKILL.md'))) die(`✗ No skill found at ${SKILL_DIR} (missing dir or SKILL.md).`)

const SHA = out('git', ['-C', SRC, 'rev-parse', '--short', 'HEAD'])
if (DRY) {
  console.log(`[dry-run] would sync ${SKILL_DIR} (${MONOREPO}@${SHA}) → https://github.com/${PUB_REPO} (HEAD:main). No clone, no push.`)
  process.exit(0)
}
const TMP = fs.mkdtempSync(join(os.tmpdir(), 'skill-sync-'))
const cleanup = () => { try { fs.rmSync(TMP, { recursive: true, force: true }) } catch { /* noop */ } }
process.on('exit', cleanup)

console.log(`→ Syncing ${SKILL_DIR} from ${MONOREPO}@${SHA} to ${PUB_REPO}`)

let PUSH_URL = ''
const TOKEN = process.env.SKILL_SYNC_TOKEN
if (TOKEN) {
  run('git', ['clone', '--depth', '1', `https://github.com/${PUB_REPO}.git`, TMP, '-q'])
  PUSH_URL = `https://x-access-token:${TOKEN}@github.com/${PUB_REPO}.git`
} else {
  if (!ok('gh', ['--version'])) die('Need either SKILL_SYNC_TOKEN or the gh CLI authed.')
  run('gh', ['repo', 'clone', PUB_REPO, TMP, '--', '--depth', '1', '-q'])
}

// Mirror the skill dir (delete-extra: clear dest then copy so removals propagate).
const destSkill = join(TMP, SKILL_DIR)
fs.rmSync(destSkill, { recursive: true, force: true })
fs.cpSync(join(SRC, SKILL_DIR), destSkill, { recursive: true })

// Per-repo marketplace lists ONLY this skill's plugin.
const SRC_MARKET = join(SRC, '.claude-plugin/marketplace.json')
if (!fs.existsSync(SRC_MARKET)) {
  console.error(`No ${SRC_MARKET}. Create it ({"plugins":[]}) or scaffold a skill first (npm run new:skill <name>).`)
  process.exit(1)
}
const market = JSON.parse(fs.readFileSync(SRC_MARKET, 'utf8'))
market.plugins = (market.plugins || []).filter((p) => p.name === NAME)
fs.mkdirSync(join(TMP, '.claude-plugin'), { recursive: true })
fs.writeFileSync(join(TMP, '.claude-plugin/marketplace.json'), JSON.stringify(market, null, 2) + '\n')

// Repo landing README = authored skill README with a shared "use it in any MCP
// client" footer inserted before "## License" (appended if no License heading).
const MCP_FOOTER = mcpFooter()

const readme = fs.readFileSync(join(SRC, SKILL_DIR, 'README.md'), 'utf8')
const licIdx = readme.search(/^## License/m)
const landing = licIdx === -1
  ? readme.replace(/\n*$/, '\n\n') + MCP_FOOTER
  : readme.slice(0, licIdx) + MCP_FOOTER + '\n' + readme.slice(licIdx)
fs.writeFileSync(join(TMP, 'README.md'), landing)
fs.copyFileSync(join(SRC, SKILL_DIR, 'LICENSE'), join(TMP, 'LICENSE'))

if (!out('git', ['-C', TMP, 'status', '--porcelain'])) {
  console.log('✓ Public repo already up to date — nothing to sync.')
  process.exit(0)
}

run('git', ['-C', TMP, 'add', '-A'])
run('git', ['-C', TMP, '-c', `user.name=${GIT_NAME}`, '-c', `user.email=${GIT_EMAIL}`,
  'commit', '-q', '-m', `Sync ${LABEL} skill from ${MONOREPO}@${SHA}`])
if (PUSH_URL) run('git', ['-C', TMP, 'push', '-q', PUSH_URL, 'HEAD:main'])
else run('git', ['-C', TMP, 'push', '-q', 'origin', 'HEAD:main'])
console.log(`✓ Synced to https://github.com/${PUB_REPO}`)
