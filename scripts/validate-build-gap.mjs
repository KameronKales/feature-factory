#!/usr/bin/env node
// Static self-check for a customized build-gap workflow — run it AFTER editing
// .claude/workflows/build-gap.js for your product, BEFORE a real (code-writing) run.
//
// It catches the mistakes that otherwise only surface mid-build:
//   - leftover {{PLACEHOLDERS}} you forgot to fill in
//   - the layer set being out of sync between the LAYERS array, the PLAN-schema
//     `enum`, and the G('<key>') lookups (these are declared separately and can drift)
//   - a parse error (it wraps + compiles the file the way the runtime does)
//
// It does NOT run the workflow or call any AI — it's a fast, offline lint.
//
// Usage:
//   node scripts/validate-build-gap.mjs [path]   # default .claude/workflows/build-gap.js
//   node scripts/validate-build-gap.mjs --help

import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const argv = process.argv.slice(2)
if (argv.includes('--help') || argv.includes('-h')) {
  process.stdout.write(`validate-build-gap — offline lint for a customized build-gap workflow.

Usage:
  node scripts/validate-build-gap.mjs [path]   (default .claude/workflows/build-gap.js)
  node scripts/validate-build-gap.mjs --help

Checks: unreplaced {{PLACEHOLDERS}}, layer consistency (LAYERS vs PLAN enum vs G('key')),
and that the file parses under the Workflow runtime wrapper. Exit 0 = clean, 1 = problems.
`)
  process.exit(0)
}

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const target = argv.find((a) => !a.startsWith('--')) || '.claude/workflows/build-gap.js'
const path = resolve(repoRoot, target)

if (!fs.existsSync(path)) {
  console.error(`✗ Not found: ${target}\n  Pass a path, or run from a repo with .claude/workflows/build-gap.js.`)
  process.exit(1)
}
const src = fs.readFileSync(path, 'utf8')
const problems = []
const notes = []

// 1) Unreplaced placeholders.
const placeholders = [...src.matchAll(/\{\{([^}]+)\}\}/g)].map((m) => m[0])
if (placeholders.length) {
  problems.push(`Unreplaced placeholder(s): ${[...new Set(placeholders)].join(', ')} — fill these in for your product.`)
}

// 2) It must still parse the way the runtime evaluates it (top-level return is legal there).
try {
  const body = src.replace(/^export\s+/gm, '')
  // eslint-disable-next-line no-new-func
  new Function('args', 'phase', 'log', 'parallel', 'agent', 'budget', 'workflow', `return (async () => {\n${body}\n})`)
} catch (e) {
  problems.push(`Does not parse: ${e.message}`)
}

// 3) Layer-set consistency. These three are declared independently and can silently drift.
const layersM = src.match(/const\s+LAYERS\s*=\s*\[([^\]]*)\]/)
// The layer enum is the one on the group `key` property — anchor on it so we don't pick up an
// unrelated literal enum (e.g. issue severity). A file using `enum: LAYERS` (a variable) won't
// match here, which is correct: we then validate G() against the LAYERS array instead.
const enumM = src.match(/key:\s*\{\s*type:\s*['"]string['"]\s*,\s*enum:\s*\[([^\]]*)\]/)
const strList = (s) => [...s.matchAll(/['"]([^'"]+)['"]/g)].map((m) => m[1])
const gKeys = [...new Set([...src.matchAll(/\bG\(\s*['"]([^'"]+)['"]\s*\)/g)].map((m) => m[1]))]

const layers = layersM ? strList(layersM[1]) : null
const enumKeys = enumM ? strList(enumM[1]) : null

if (layers && enumKeys) {
  const a = JSON.stringify(layers), b = JSON.stringify(enumKeys)
  if (a !== b) problems.push(`LAYERS ${a} and the PLAN-schema enum ${b} disagree — they must list the same keys in the same order.`)
} else if (!layers && enumKeys) {
  notes.push(`No LAYERS array found (the finance/log-analytics examples hardcode the enum instead). Enum keys: ${JSON.stringify(enumKeys)}.`)
}

const known = layers || enumKeys
if (known && gKeys.length) {
  const unknown = gKeys.filter((k) => !known.includes(k))
  if (unknown.length) problems.push(`G() references layer key(s) not in the layer set: ${unknown.join(', ')}. Known: ${known.join(', ')}.`)
  const unused = known.filter((k) => !gKeys.includes(k))
  if (unused.length) notes.push(`Layer key(s) declared but never built via G(): ${unused.join(', ')} (fine if intentional).`)
}

// Report.
for (const n of notes) console.log(`• ${n}`)
if (problems.length) {
  console.error(`\n✗ ${target} has ${problems.length} issue(s):`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`✓ ${target} looks consistent (placeholders filled, layers aligned, parses).`)
