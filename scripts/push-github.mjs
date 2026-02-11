#!/usr/bin/env node
/**
 * Push completo su GitHub: add -A, commit, push origin main.
 * Uso: node scripts/push-github.mjs [messaggio di commit]
 *      npm run push
 *      npm run push -- -- "fix: descrizione"
 */
import { execSync } from 'child_process'
import { resolve } from 'path'

const repoRoot = resolve(process.cwd())
const msg = process.argv.slice(2).join(' ').trim() || `chore: sync ${new Date().toISOString().slice(0, 10)}`

function run(cmd, opts = {}) {
  try {
    return execSync(cmd, { encoding: 'utf8', cwd: repoRoot, ...opts })
  } catch (e) {
    if (e.stdout) process.stdout.write(e.stdout)
    if (e.stderr) process.stderr.write(e.stderr)
    throw e
  }
}

function runArgs(args, opts = {}) {
  try {
    return execSync(args[0], args.slice(1), { encoding: 'utf8', cwd: repoRoot, ...opts })
  } catch (e) {
    if (e.stdout) process.stdout.write(e.stdout)
    if (e.stderr) process.stderr.write(e.stderr)
    throw e
  }
}

try {
  run('git add -A')
  const status = run('git status --short')
  if (!status.trim()) {
    console.log('Nessuna modifica da committare. Exit.')
    process.exit(0)
  }
  runArgs(['git', 'commit', '-m', msg])
  run('git push origin main')
  console.log('Push completato.')
} catch (e) {
  process.exit(e.status ?? 1)
}
