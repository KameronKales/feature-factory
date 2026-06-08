import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const SCRIPT = resolve(here, '..', 'new-skill.mjs')

// No-config env: proves the script imports factory.config WITHOUT throwing (bug #5) and
// reaches its own validation — a config-import throw would surface as exit 1, not exit 2.
const env = { ...process.env, FACTORY_CONFIG: '/__no_such_config__.json' }
delete env.FACTORY_ORG
delete env.FACTORY_CATALOG_REPO

test('rejects an invalid skill name with exit 2 (and imports config cleanly)', () => {
  const r = spawnSync(process.execPath, [SCRIPT, 'Bad Name'], { encoding: 'utf8', env })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Invalid name/)
})

test('with no name, prints usage and exits 2', () => {
  const r = spawnSync(process.execPath, [SCRIPT], { encoding: 'utf8', env })
  assert.equal(r.status, 2)
  assert.match(r.stderr, /Usage/)
})
