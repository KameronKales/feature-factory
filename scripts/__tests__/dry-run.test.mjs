import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const SYNC_SKILL = resolve(root, 'scripts', 'sync-skill.mjs')
const NEW_SKILL = resolve(root, 'scripts', 'new-skill.mjs')
const noConfig = (extra = {}) => {
  const e = { ...process.env, FACTORY_CONFIG: '/__no_such_config__.json', ...extra }
  delete e.FACTORY_ORG; delete e.FACTORY_CATALOG_REPO
  return { ...e, ...extra }
}

test('sync-skill --dry-run (configured) prints the plan and pushes nothing', () => {
  const env = noConfig({ FACTORY_ORG: 'test-org', FACTORY_CATALOG_REPO: 'test-org/catalog' })
  const r = spawnSync(process.execPath, [SYNC_SKILL, 'feature-factory', '--dry-run'], { encoding: 'utf8', env })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /\[dry-run\]/)
  assert.match(r.stdout, /No clone, no push/)
})

test('sync-skill --dry-run does NOT crash when org is unconfigured', () => {
  // README lists --dry-run as the safe preview BEFORE configuring — it must not stack-trace.
  const r = spawnSync(process.execPath, [SYNC_SKILL, 'feature-factory', '--dry-run'], { encoding: 'utf8', env: noConfig() })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /\[dry-run\]/)
})

test('new-skill --dry-run is side-effect-free: writes no scaffold and no marketplace entry', () => {
  const probe = 'dry-run-probe-xyz'
  assert.equal(existsSync(join(root, 'skills', probe)), false, 'probe skill must not pre-exist')
  const market = join(root, '.claude-plugin', 'marketplace.json')
  const before = existsSync(market) ? readFileSync(market, 'utf8') : null
  const r = spawnSync(process.execPath, [NEW_SKILL, probe, '--dry-run'], { encoding: 'utf8', env: noConfig() })
  assert.equal(r.status, 0, r.stderr)
  assert.match(r.stdout, /\[dry-run\]/)
  assert.equal(existsSync(join(root, 'skills', probe)), false, 'dry-run must NOT scaffold the skill dir')
  const after = existsSync(market) ? readFileSync(market, 'utf8') : null
  assert.equal(after, before, 'dry-run must NOT mutate marketplace.json')
})
