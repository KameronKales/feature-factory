import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const wf = (f) => readFileSync(join(repoRoot, '.claude', 'workflows', f), 'utf8')

test('research-gaps is product-neutral: no hardcoded planfi/finance paths', () => {
  const src = wf('research-gaps.js')
  // The reusable audit workflow must not assume one product's file layout.
  assert.doesNotMatch(src, /workers\/ai-mcp/, 'leaks the planfi MCP path')
  assert.doesNotMatch(src, /\bsrc\/lib\b/, 'leaks the planfi engine path')
  assert.match(src, /A\.domains/, 'domains must come from args')
})

test('no workflow ships the dead placeholder repo root', () => {
  for (const f of ['research-gaps.js', 'build-gap.js']) {
    assert.doesNotMatch(wf(f), /\/absolute\/path\/to\/YOUR-repo/, `${f} still has the placeholder root`)
  }
})

test('build-gap is honestly labeled as a per-project customization template', () => {
  // It legitimately encodes one architecture; it must say so rather than masquerade as generic.
  assert.match(wf('build-gap.js'), /CUSTOMIZE-PER-PROJECT TEMPLATE/i)
})
