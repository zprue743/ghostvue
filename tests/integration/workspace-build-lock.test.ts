/** @vitest-environment node */
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { afterEach, describe, expect, it } from 'vitest'

import {
  ensureWorkspaceBuilt,
  workspaceBuildLockPath,
} from '../../scripts/lib/workspace-build-lock.js'

const lockModule = fileURLToPath(
  new URL('../../scripts/lib/workspace-build-lock.js', import.meta.url),
)

const roots: string[] = []
afterEach(async () => {
  for (const root of roots.splice(0)) {
    await rm(root, { recursive: true, force: true })
    await rm(workspaceBuildLockPath(root), { recursive: true, force: true })
  }
})

async function workspace() {
  const root = await mkdtemp(join(tmpdir(), 'ghostvue-build-lock-'))
  roots.push(root)
  return root
}

// Each child process stands in for one parallel `--ensure-built` smoke script.
function buildInChild(root: string) {
  const script = `
    import { appendFileSync, existsSync, writeFileSync } from 'node:fs'
    import { join } from 'node:path'
    import { ensureWorkspaceBuilt } from ${JSON.stringify(lockModule)}
    const root = ${JSON.stringify(root)}
    const marker = join(root, 'built')
    ensureWorkspaceBuilt({
      root,
      isBuilt: () => existsSync(marker),
      build: () => {
        appendFileSync(join(root, 'builds.log'), 'build\\n')
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 300)
        writeFileSync(marker, '')
      },
    })
  `
  return new Promise<number | null>((resolve, reject) => {
    const child = spawn(process.execPath, ['--input-type=module', '-e', script])
    child.on('error', reject)
    child.on('exit', resolve)
  })
}

describe('ensureWorkspaceBuilt', () => {
  it('skips the build when the workspace is already built', async () => {
    const root = await workspace()
    let builds = 0
    const ran = ensureWorkspaceBuilt({
      root,
      isBuilt: () => true,
      build: () => builds++,
    })
    expect(ran).toBe(false)
    expect(builds).toBe(0)
  })

  it('builds once across concurrent callers and releases the lock', async () => {
    const root = await workspace()
    const codes = await Promise.all([1, 2, 3].map(() => buildInChild(root)))
    expect(codes).toEqual([0, 0, 0])
    const log = await readFile(join(root, 'builds.log'), 'utf8')
    expect(log.trim().split('\n')).toEqual(['build'])
    expect(existsSync(workspaceBuildLockPath(root))).toBe(false)
  })

  it('takes over a lock left by a process that no longer exists', async () => {
    const root = await workspace()
    const lock = workspaceBuildLockPath(root)
    mkdirSync(lock)
    // PIDs are capped well below this on Linux and macOS.
    writeFileSync(join(lock, 'pid'), '2147483646')
    let builds = 0
    const ran = ensureWorkspaceBuilt({
      root,
      isBuilt: () => builds > 0,
      build: () => builds++,
      timeoutMs: 5_000,
    })
    expect(ran).toBe(true)
    expect(builds).toBe(1)
    expect(existsSync(lock)).toBe(false)
  })

  it('times out instead of waiting forever on a live lock', async () => {
    const root = await workspace()
    const lock = workspaceBuildLockPath(root)
    mkdirSync(lock)
    writeFileSync(join(lock, 'pid'), String(process.pid))
    expect(() =>
      ensureWorkspaceBuilt({
        root,
        isBuilt: () => false,
        build: () => undefined,
        timeoutMs: 300,
      }),
    ).toThrow(/Timed out waiting for another workspace build/u)
    expect(existsSync(lock)).toBe(true)
  })
})
