import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

// Parse-check the workflow .js files AND the copy-me example/generic workflows under docs/.
// These can't go through `node --check` (syntax.check.mjs) because they use a top-level
// `return` — legal inside the Workflow runtime's async wrapper, illegal in a standalone
// module. So we wrap each source the same way the runtime does and compile it with the JS
// engine (new Function), which throws on any real syntax error. Adopters are told to `cp`
// these into .claude/workflows/, so a broken example must fail CI here, not on a live run.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')

const FILES = [
  '.claude/workflows/research-gaps.js',
  '.claude/workflows/build-gap.js',
  'docs/build-gap.generic.js',
  'docs/examples/log-analytics/build-gap.js',
  'docs/examples/npm-library/build-gap.js',
]

for (const rel of FILES) {
  test(`parses under the Workflow runtime wrapper: ${rel}`, () => {
    const src = readFileSync(join(repoRoot, rel), 'utf8')
    // Strip the `export` keyword (illegal inside new Function) and wrap so the
    // top-level `return` is valid, mirroring how the runtime evaluates a workflow.
    const body = src.replace(/^export\s+/gm, '')
    assert.doesNotThrow(
      () => new Function('args', 'phase', 'log', 'parallel', 'agent', 'budget', 'workflow',
        `return (async () => {\n${body}\n})`),
      `${rel} failed to parse (syntax error or shape drift)`,
    )
  })
}
