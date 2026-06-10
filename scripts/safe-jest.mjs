#!/usr/bin/env node
// Hang-proof jest runner — OS-INDEPENDENT (Windows / macOS / Linux).
//
// Why: bare `npx jest` can hang indefinitely — on open handles after tests pass,
// or on a flaky full-suite run — which silently blocks a workflow/flow forever.
// This wrapper guarantees jest ALWAYS terminates and reports pass / fail / timeout,
// so an agent can tell a real failure from a hang.
//
// This is the portable replacement for the old scripts/safe-jest.sh (which relied
// on bash + `timeout`/`gtimeout`/`perl`, none guaranteed on Windows). Node's own
// child_process + a kill-timer does the same job identically on every OS.
//
// Hardening: hard wall-clock timeout (we kill the child tree), plus --forceExit
// (don't hang on open handles), --runInBand (no orphaned workers to leak), --ci,
// and a per-test timeout.
//
// Usage:
//   node scripts/safe-jest.mjs <path-or-pattern...>     # root jest
//   node scripts/safe-jest.mjs --worker [args...]       # second test root (see below)
//   node scripts/safe-jest.mjs --help                   # print this usage
//   SAFE_JEST_WALL=600 node scripts/safe-jest.mjs ...    # override the 300s wall clock
//
// The `--worker` mode runs jest in a SECOND directory with its own config — useful for
// monorepos that have a separate test root (the finance example uses workers/ai-mcp). It
// is PRODUCT-SPECIFIC, so its location is configurable (defaults match the finance example
// for backward-compatibility); point it at your own second root via env or factory.config:
//   SAFE_JEST_WORKER_DIR=packages/api          (or factory.config.json "safeJestWorkerDir")
//   SAFE_JEST_WORKER_CONFIG=jest.config.cjs    (or "safeJestWorkerConfig"; "" = jest's default)
// If your product has only one test root, you don't need `--worker` at all — just pass paths.
//
// Exit codes: jest's code on completion; 124 on wall-clock timeout (a HANG, not a
// test failure — re-scope / investigate, don't treat as a red test).

import { spawn } from 'node:child_process'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')

// Optional config file (same one the distribution scripts read) for non-env defaults.
let fileCfg = {}
try {
  const p = process.env.FACTORY_CONFIG || join(__dirname, 'factory.config.json')
  if (fs.existsSync(p)) fileCfg = JSON.parse(fs.readFileSync(p, 'utf8'))
} catch { /* a malformed config shouldn't block tests; env still works */ }
const cfg = (envKey, fileKey, fallback) => process.env[envKey] ?? fileCfg[fileKey] ?? fallback

const WALL = Number(process.env.SAFE_JEST_WALL || 300)
const COMMON = ['--forceExit', '--runInBand', '--ci', '--testTimeout=20000']
const isWin = process.platform === 'win32'

let args = process.argv.slice(2)

if (args[0] === '--help' || args[0] === '-h') {
  process.stdout.write(`safe-jest — hang-proof jest runner (kills the tree on a wall-clock timeout).

Usage:
  node scripts/safe-jest.mjs <path-or-pattern...>   run jest at the repo root
  node scripts/safe-jest.mjs --worker [args...]      run jest in the configured second root
  node scripts/safe-jest.mjs --help                  show this help

Env / factory.config.json:
  SAFE_JEST_WALL=<seconds>          wall-clock timeout (default 300)
  SAFE_JEST_WORKER_DIR=<path>       second test root for --worker (default workers/ai-mcp) [safeJestWorkerDir]
  SAFE_JEST_WORKER_CONFIG=<file>    jest config in that dir ("" for default) [safeJestWorkerConfig]

Exit 124 = a HANG (re-scope/investigate), NOT a test failure.
`)
  process.exit(0)
}

let cwd = ROOT
let jestArgs

if (args[0] === '--worker') {
  args = args.slice(1)
  const workerDir = cfg('SAFE_JEST_WORKER_DIR', 'safeJestWorkerDir', 'workers/ai-mcp')
  const workerCfg = cfg('SAFE_JEST_WORKER_CONFIG', 'safeJestWorkerConfig', 'jest.config.cjs')
  cwd = resolve(ROOT, workerDir)
  if (!fs.existsSync(cwd)) {
    process.stderr.write(
      `safe-jest: --worker dir "${workerDir}" not found under ${ROOT}.\n` +
      `This mode is product-specific. Set SAFE_JEST_WORKER_DIR (or "safeJestWorkerDir" in\n` +
      `factory.config.json) to your second test root, or drop --worker if you have only one.\n`,
    )
    process.exit(2)
  }
  jestArgs = ['jest', ...(workerCfg ? ['--config', workerCfg] : []), ...COMMON, ...args]
} else {
  jestArgs = ['jest', ...COMMON, ...args]
}

// `npx` is `npx.cmd` on Windows; spawning with shell:true resolves the right one
// and keeps arg quoting consistent across platforms.
const child = spawn('npx', jestArgs, {
  cwd,
  stdio: 'inherit',
  shell: true,
  // POSIX: own process group (pgid = child.pid) so the timeout can signal the
  // whole tree via process.kill(-pid). Windows uses taskkill /t instead.
  detached: !isWin,
  env: { ...process.env, NODE_OPTIONS: `${process.env.NODE_OPTIONS || ''} --max-old-space-size=4096`.trim() },
})

let timedOut = false
const timer = setTimeout(() => {
  timedOut = true
  // Kill the whole process tree so no orphaned jest workers leak.
  if (isWin) {
    spawn('taskkill', ['/pid', String(child.pid), '/t', '/f'], { stdio: 'ignore' })
  } else {
    try { process.kill(-child.pid, 'SIGTERM') } catch { child.kill('SIGTERM') }
    setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL') } catch { child.kill('SIGKILL') } }, 3000)
  }
  process.stderr.write(`\n::SAFE_JEST_TIMEOUT:: exceeded ${WALL}s\n`)
}, WALL * 1000)

child.on('exit', (code, signal) => {
  clearTimeout(timer)
  if (timedOut) {
    process.stderr.write(
      `::SAFE_JEST_TIMEOUT:: jest exceeded ${WALL}s — treat as a HANG (re-scope/investigate), NOT a test failure.\n`,
    )
    process.exit(124)
  }
  process.exit(code === null ? (signal ? 1 : 0) : code)
})

child.on('error', (err) => {
  clearTimeout(timer)
  process.stderr.write(`safe-jest: failed to launch jest: ${err.message}\n`)
  process.exit(1)
})
