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
//   node scripts/safe-jest.mjs --worker [args...]       # worker suite (workers/ai-mcp)
//   SAFE_JEST_WALL=600 node scripts/safe-jest.mjs ...   # override the 300s wall clock
//
// Exit codes: jest's code on completion; 124 on wall-clock timeout (a HANG, not a
// test failure — re-scope / investigate, don't treat as a red test).

import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(__dirname, '..')
const WALL = Number(process.env.SAFE_JEST_WALL || 300)
const COMMON = ['--forceExit', '--runInBand', '--ci', '--testTimeout=20000']
const isWin = process.platform === 'win32'

let args = process.argv.slice(2)
let cwd = ROOT
let jestArgs

if (args[0] === '--worker') {
  args = args.slice(1)
  cwd = resolve(ROOT, 'workers/ai-mcp')
  jestArgs = ['jest', '--config', 'jest.config.cjs', ...COMMON, ...args]
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
