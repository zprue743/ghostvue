import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const POLL_MS = 250
const DEFAULT_TIMEOUT_MS = 15 * 60_000

/**
 * Directory used as the build lock for one workspace. It lives in the OS temp
 * directory rather than the workspace so lint, Prettier, and git never see it.
 *
 * @param {string} root
 */
export function workspaceBuildLockPath(root) {
  const key = createHash('sha256').update(resolve(root)).digest('hex')
  return join(tmpdir(), `ghostvue-build-${key.slice(0, 16)}.lock`)
}

/** @param {number} ms */
function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)
}

/** @param {number} pid */
function processAlive(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch (error) {
    // EPERM means the process exists but belongs to someone else.
    return /** @type {NodeJS.ErrnoException} */ (error).code === 'EPERM'
  }
}

/** @param {string} lock */
function lockHolderGone(lock) {
  try {
    const pid = Number(readFileSync(join(lock, 'pid'), 'utf8'))
    return Number.isInteger(pid) && pid > 0 && !processAlive(pid)
  } catch {
    // The holder may not have written its pid yet; treat the lock as live.
    return false
  }
}

/**
 * Run `build` at most once across concurrent callers in the same workspace.
 *
 * Packed smoke scripts run from parallel Vitest workers with `--ensure-built`.
 * Two simultaneous `pnpm build`s both regenerate `docs/reference/` (remove,
 * then rewrite), so one can delete files the other is writing. The lock makes
 * later callers wait, then re-check `isBuilt` so they reuse the first build.
 *
 * @param {{
 *   root: string
 *   isBuilt: () => boolean
 *   build: () => void
 *   timeoutMs?: number
 * }} options
 * @returns {boolean} Whether this caller ran the build.
 */
export function ensureWorkspaceBuilt({
  root,
  isBuilt,
  build,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}) {
  if (isBuilt()) return false
  const lock = workspaceBuildLockPath(root)
  const deadline = Date.now() + timeoutMs
  for (;;) {
    try {
      mkdirSync(lock)
      break
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code !== 'EEXIST') {
        throw error
      }
      if (lockHolderGone(lock)) {
        rmSync(lock, { recursive: true, force: true })
        continue
      }
      if (Date.now() > deadline) {
        throw new Error(
          `Timed out waiting for another workspace build (lock: ${lock})`,
          { cause: error },
        )
      }
      sleepSync(POLL_MS)
    }
  }
  try {
    writeFileSync(join(lock, 'pid'), String(process.pid))
    if (isBuilt()) return false
    build()
    return true
  } finally {
    rmSync(lock, { recursive: true, force: true })
  }
}
