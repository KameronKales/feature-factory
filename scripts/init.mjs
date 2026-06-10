#!/usr/bin/env node
// Bootstrap the Feature Factory harness into the CURRENT repo, in one command.
//
//   npx github:KameronKales/feature-factory            # copy the harness into ./
//   npx github:KameronKales/feature-factory init       # same ('init' is optional)
//   node scripts/init.mjs [--dry-run] [--force] [--help]
//
// It copies the harness files (workflows, scripts, skill, docs, templates, CI) into the
// current directory WITHOUT clobbering anything you already have, defaults to the no-publish
// 'in-repo' mode (so no config is required), and parse-checks the result. It never touches
// your package.json or your source. Re-runnable: existing files are skipped unless --force.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { execFileSync } from 'node:child_process'

const argv = process.argv.slice(2).filter((a) => a !== 'init') // 'init' subcommand is optional/ignored
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(`feature-factory init — copy the harness into the current repo.

Usage:
  npx github:KameronKales/feature-factory [init] [--dry-run] [--force]
  node scripts/init.mjs [--dry-run] [--force] [--help]

  --dry-run   list what would be copied; write nothing
  --force     overwrite files that already exist (default: skip them)
  --help      show this help

Defaults to 'in-repo' mode: builds into your repo, publishes nothing, needs no config.
`)
  process.exit(0)
}
const DRY = argv.includes('--dry-run')
const FORCE = argv.includes('--force')

const pkgRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') // the harness source (this package)
const dest = process.cwd() // the repo you're installing into

if (path.resolve(pkgRoot) === path.resolve(dest)) {
  console.error('✗ Run this from the repo you want to ADD the factory to, not from inside the\n' +
    '  feature-factory repo itself (source and destination are the same directory).')
  process.exit(1)
}

// The harness files an adopter needs. Directories are copied recursively. Anything not
// committed (e.g. a gitignored factory.config.json) simply isn't in the package, so secrets
// can't travel. package.json is intentionally NOT copied — we never touch yours.
const MANIFEST = [
  '.claude/workflows/research-gaps.js',
  '.claude/workflows/build-gap.js',
  'scripts/',
  'skills/feature-factory/',
  'docs/',
  'templates/skill/',
  'templates/skill-local/',
  '.claude-plugin/marketplace.json',
  '.github/workflows/ci.yml',
]

// Copy a few files to a DIFFERENT path in the target so they can't clobber the adopter's own
// files of the same name (their CI lives at .github/workflows/ci.yml — ours coexists beside it).
const RENAME = { '.github/workflows/ci.yml': '.github/workflows/feature-factory-ci.yml' }

let copied = 0, skipped = 0
const walk = (rel) => {
  const src = path.join(pkgRoot, rel)
  if (!fs.existsSync(src)) return
  const stat = fs.statSync(src)
  if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(src)) walk(path.join(rel, entry))
    return
  }
  const destRel = RENAME[rel] || rel
  const target = path.join(dest, destRel)
  const label = destRel === rel ? destRel : `${rel} → ${destRel}`
  if (fs.existsSync(target) && !FORCE) {
    skipped++
    console.log(`  skip (exists): ${label}`)
    return
  }
  const existed = fs.existsSync(target)
  copied++
  if (DRY) { console.log(`  would copy:    ${label}`); return }
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(src, target)
  console.log(`  ${existed ? 'overwrite' : 'copy'}:        ${label}`)
}

console.log(`${DRY ? '[dry-run] ' : ''}Installing the Feature Factory harness into ${dest}\n`)
for (const rel of MANIFEST) walk(rel)

// Make sure a local config (if they ever create one) stays out of git.
const gi = path.join(dest, '.gitignore')
const ignoreLine = 'scripts/factory.config.json'
if (!DRY) {
  const cur = fs.existsSync(gi) ? fs.readFileSync(gi, 'utf8') : ''
  if (!cur.split(/\r?\n/).includes(ignoreLine)) {
    fs.writeFileSync(gi, (cur && !cur.endsWith('\n') ? cur + '\n' : cur) +
      '\n# Feature Factory: local push-target config (never commit)\n' + ignoreLine + '\n')
    console.log(`  + .gitignore: ${ignoreLine}`)
  }
}

console.log(`\n${DRY ? '[dry-run] ' : ''}${copied} file(s) ${DRY ? 'would be copied' : 'copied'}, ${skipped} skipped.`)

// We never modify your package.json. If it already defines check/test scripts, ours don't
// collide — the harness gate is run by name below and by the copied CI, both via direct `node`.
let pkgNote = ''
const pkgPath = path.join(dest, 'package.json')
if (fs.existsSync(pkgPath)) {
  try {
    const s = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).scripts || {}
    const clash = ['check', 'test'].filter((k) => s[k])
    if (clash.length) {
      pkgNote = `\nNote: your package.json already defines ${clash.map((k) => `"${k}"`).join(' & ')} — ` +
        `left untouched. Run the harness gate directly instead:\n` +
        `       node scripts/__tests__/syntax.check.mjs   &&   node --test scripts/__tests__/\n` +
        `     (the copied feature-factory-ci.yml already calls those directly, so no collision.)`
    }
  } catch { /* unreadable package.json — nothing to warn about */ }
}

if (DRY) process.exit(0)

// Parse-check what we just dropped in (read-only, safe, fast).
try {
  console.log('\nVerifying the harness parses…')
  execFileSync(process.execPath, [path.join(dest, 'scripts/__tests__/syntax.check.mjs')], { cwd: dest, stdio: 'inherit' })
} catch {
  console.error('⚠ parse-check failed — see above. The files copied, but check your Node version (>=18).')
}

console.log(`
✅ Installed (in-repo mode — builds into this repo, publishes nothing, no config needed).

Next steps:
  1. Make it your own:
       cp docs/FEATURE_PLAYBOOK.generic.md docs/FEATURE_PLAYBOOK.md   # your Definition of Done
       # edit docs/FEATURE_PLAYBOOK.md and .claude/workflows/build-gap.js for your stack
       node scripts/validate-build-gap.mjs                            # sanity-check it
  2. (Optional) make the skill discoverable: cp -r skills/feature-factory ~/.claude/skills/  then restart Claude Code.
  3. Run it: in Claude Code, say "run the feature factory" (start research-only — see docs/QUICKSTART.md).

Read docs/QUICKSTART.md and docs/SAFETY.md before a code-writing run.${pkgNote}`)
