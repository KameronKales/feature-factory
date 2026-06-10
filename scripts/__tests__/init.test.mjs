import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..')
const initScript = join(repoRoot, 'scripts', 'init.mjs')
const run = (cwd, args = []) => execFileSync(process.execPath, [initScript, ...args], { cwd, encoding: 'utf8' })
const tmp = () => mkdtempSync(join(tmpdir(), 'ff-init-'))

test('--dry-run writes nothing into the target repo', () => {
  const dir = tmp()
  try {
    run(dir, ['--dry-run'])
    assert.ok(!existsSync(join(dir, '.claude')), 'dry-run must not create files')
    assert.ok(!existsSync(join(dir, 'scripts')), 'dry-run must not create files')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})

test('real install copies the harness and never clobbers package.json or an existing ci.yml', () => {
  const dir = tmp()
  try {
    mkdirSync(join(dir, '.github', 'workflows'), { recursive: true })
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: 'their-app', scripts: { check: 'eslint .', test: 'vitest' } }))
    writeFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'name: their ci\n')

    const out = run(dir)

    // Their files are untouched.
    const pkg = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'))
    assert.equal(pkg.scripts.check, 'eslint .', 'must not overwrite their check script')
    assert.equal(pkg.scripts.test, 'vitest', 'must not overwrite their test script')
    assert.match(readFileSync(join(dir, '.github', 'workflows', 'ci.yml'), 'utf8'), /their ci/, 'must not clobber their ci.yml')

    // Ours lands beside theirs, harness files arrive, config stays gitignored.
    assert.ok(existsSync(join(dir, '.github', 'workflows', 'feature-factory-ci.yml')), 'factory CI copied under a distinct name')
    assert.ok(existsSync(join(dir, '.claude', 'workflows', 'build-gap.js')), 'workflows copied')
    assert.ok(existsSync(join(dir, 'scripts', 'safe-jest.mjs')), 'scripts copied')
    assert.match(readFileSync(join(dir, '.gitignore'), 'utf8'), /scripts\/factory\.config\.json/, 'gitignores local config')

    // And it warns about the pre-existing check/test rather than silently relying on them.
    assert.match(out, /already defines "check" & "test"/, 'warns about the script-name collision')
  } finally { rmSync(dir, { recursive: true, force: true }) }
})
