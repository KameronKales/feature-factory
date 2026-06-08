#!/usr/bin/env node
// Cross-platform keep-awake — stops the machine sleeping during a long unattended
// run (e.g. the feature factory) so workflows/schedulers aren't paused.
//
// Portable replacement for the macOS-only `caffeinate`. Picks the right inhibitor
// per OS; if none is available it falls back to a no-op heartbeat (the run still
// works, the machine just may sleep on its own power settings).
//
// Usage:
//   node scripts/keep-awake.mjs [seconds]     # default 43200 (12h)
//   (run it in the background; it exits on its own after the duration)

import { spawn } from 'node:child_process'

const seconds = Number(process.argv[2] || 43200)
const platform = process.platform

function run(cmd, args) {
  const c = spawn(cmd, args, { stdio: 'ignore' })
  c.on('error', heartbeat) // command missing -> degrade gracefully
  // Safety net: ensure we don't outlive the requested window.
  setTimeout(() => { try { c.kill() } catch { /* noop */ } process.exit(0) }, seconds * 1000)
}

function heartbeat() {
  // No native inhibitor available — just keep the process alive for the window.
  // (Doesn't force-prevent sleep, but harmless and keeps the API uniform.)
  console.error('keep-awake: no native inhibitor found; running a passive heartbeat.')
  setTimeout(() => process.exit(0), seconds * 1000)
}

if (platform === 'darwin') {
  // -dimsu: prevent display, idle, disk, system sleep; -t: timeout in seconds.
  run('caffeinate', ['-dimsu', '-t', String(seconds)])
} else if (platform === 'win32') {
  // SetThreadExecutionState keeps the system + display awake until the process exits.
  const ps = [
    'Add-Type -Name P -Namespace W -MemberDefinition \'[DllImport("kernel32.dll")] public static extern uint SetThreadExecutionState(uint e);\';',
    '[W.P]::SetThreadExecutionState(0x80000000 -bor 0x00000001 -bor 0x00000002);',
    `Start-Sleep -Seconds ${seconds}`,
  ].join(' ')
  run('powershell', ['-NoProfile', '-Command', ps])
} else {
  // Linux: systemd-inhibit if present, else a passive heartbeat.
  run('systemd-inhibit', ['--what=idle:sleep', '--why=feature-factory', 'sleep', String(seconds)])
}
