import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SYNC_SKILL = resolve(root, 'scripts', 'sync-skill.mjs')

// Config present (so the push target resolves) but --dry-run must do ZERO network /
// ZERO side effects: it prints the plan and exits 0 before any clone/push.
const env = {
  ...process.env,
  FACTORY_ORG: 'test-org',
  FACTORY_CATALOG_REPO: 'test-org/catalog',
  FACTORY_CONFIG: '/__no_such_config__.json',
}

test('sync-skill --dry-run prints the plan and pushes nothing (exit 0)', () => {
  // feature-factory is a real skill dir in this repo, so the skill-exists check passes.
  const r = spawnSync(process.execPath, [SYNC_SKILL, 'feature-factory', '--dry-run'], { encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /\[dry-run\]/)
  assert.match(r.stdout, /No clone, no push/)
})
