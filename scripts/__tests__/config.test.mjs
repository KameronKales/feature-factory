import { test } from 'node:test'
import assert from 'node:assert/strict'

// Force a no-config environment so this is deterministic regardless of any local
// factory.config.json or FACTORY_* vars the developer may have set.
process.env.FACTORY_CONFIG = '/__feature_factory_no_such_config__.json'
delete process.env.FACTORY_ORG
delete process.env.FACTORY_CATALOG_REPO

const cfg = await import('../factory.config.mjs')

test('importing the config never throws without org/catalogRepo (lazy resolution — bug #5)', () => {
  // Cosmetic fields resolve to neutral placeholders; nothing throws at import time.
  assert.equal(typeof cfg.AUTHOR.name, 'string')
  assert.ok(cfg.MONOREPO.includes('/'))
  assert.equal(typeof cfg.getOrg, 'function')
  assert.equal(typeof cfg.getCatalogRepo, 'function')
})

test('no-accidental-push guarantee: getOrg/getCatalogRepo throw a clear error only when read', () => {
  assert.throws(() => cfg.getOrg(), /"org" is required/)
  assert.throws(() => cfg.getCatalogRepo(), /"catalogRepo" is required/)
})
