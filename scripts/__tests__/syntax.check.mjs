#!/usr/bin/env node
// `npm run check` — parse-check (node --check) every harness script. Cross-platform,
// zero-dependency. This is the factory's own lint/typecheck gate (the scripts are plain
// ESM, so a syntax parse is the meaningful static check). CI runs this on every push.
import { execFileSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, resolve } from 'node:path'

// NOTE: only scripts/*.mjs are parse-checked. The .claude/workflows/*.js files use a
// top-level `return` (valid inside the Workflow runtime's async wrapper, illegal as a
// standalone module), so `node --check` can't parse them — their content is guarded by
// scripts/__tests__/workflows.test.mjs instead.
const here = dirname(fileURLToPath(import.meta.url))
const scriptsDir = resolve(here, '..')
const files = readdirSync(scriptsDir).filter((f) => f.endsWith('.mjs')).sort()

let bad = 0
for (const f of files) {
  try {
    execFileSync(process.execPath, ['--check', join(scriptsDir, f)], { stdio: 'pipe' })
  } catch (e) {
    bad++
    console.error(`✗ ${f}\n${(e.stderr || e.message || '').toString().trim()}`)
  }
}
if (bad) {
  console.error(`\n${bad} script(s) failed node --check`)
  process.exit(1)
}
console.log(`✓ ${files.length} harness scripts pass node --check`)
