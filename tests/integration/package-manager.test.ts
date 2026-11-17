/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import { resolvePackageManagerInvocation } from '../../scripts/lib/package-manager.js'
import { buildVisualDockerArgs } from '../../scripts/lib/test-visual-docker.js'

describe('package-manager invocation resolution', () => {
  it('passes through directly on POSIX platforms', () => {
    expect(
      resolvePackageManagerInvocation('pnpm', ['exec', 'vitest', 'run'], {
        platform: 'linux',
        env: {},
      }),
    ).toEqual({
      file: 'pnpm',
      args: ['exec', 'vitest', 'run'],
    })
  })

  it('uses npm_execpath for pnpm on Windows when pointing to pnpm JS CLI', () => {
    const existing = new Set([
      'C:\\nvm4w\\nodejs\\node_modules\\pnpm\\bin\\pnpm.mjs',
    ])
    expect(
      resolvePackageManagerInvocation(
        'pnpm',
        ['--filter', '@ghostvue/vue', 'build'],
        {
          platform: 'win32',
          execPath: 'C:\\nvm4w\\nodejs\\node.exe',
          env: {
            npm_execpath:
              'C:\\nvm4w\\nodejs\\node_modules\\pnpm\\bin\\pnpm.mjs',
          },
          existsSync: (path) => existing.has(path),
        },
      ),
    ).toEqual({
      file: 'C:\\nvm4w\\nodejs\\node.exe',
      args: [
        'C:\\nvm4w\\nodejs\\node_modules\\pnpm\\bin\\pnpm.mjs',
        '--filter',
        '@ghostvue/vue',
        'build',
      ],
    })
  })

  it('resolves pnpm.cmd to node + pnpm.mjs on Windows without a shell', () => {
    const existing = new Set([
      'C:\\tools\\node\\pnpm.cmd',
      'C:\\tools\\node\\node_modules\\pnpm\\bin\\pnpm.mjs',
    ])
    expect(
      resolvePackageManagerInvocation('pnpm', ['exec', 'vue-tsc', '&calc'], {
        platform: 'win32',
        execPath: 'C:\\tools\\node\\node.exe',
        env: { PATH: '"C:\\tools\\node";C:\\Windows\\System32' },
        existsSync: (path) => existing.has(path),
      }),
    ).toEqual({
      file: 'C:\\tools\\node\\node.exe',
      args: [
        'C:\\tools\\node\\node_modules\\pnpm\\bin\\pnpm.mjs',
        'exec',
        'vue-tsc',
        '&calc',
      ],
    })
  })

  it('prefers native pnpm.exe on Windows when available on PATH', () => {
    const existing = new Set(['C:\\tools\\pnpm\\pnpm.exe'])
    expect(
      resolvePackageManagerInvocation('pnpm', ['verify'], {
        platform: 'win32',
        execPath: 'C:\\tools\\node\\node.exe',
        env: { PATH: 'C:\\tools\\pnpm' },
        existsSync: (path) => existing.has(path),
      }),
    ).toEqual({
      file: 'C:\\tools\\pnpm\\pnpm.exe',
      args: ['verify'],
    })
  })

  it('resolves npm.cmd to node + npm-cli.js on Windows', () => {
    const existing = new Set([
      'C:\\tools\\node\\npm.cmd',
      'C:\\tools\\node\\node_modules\\npm\\bin\\npm-cli.js',
    ])
    expect(
      resolvePackageManagerInvocation('npm', ['install', '--omit=dev'], {
        platform: 'win32',
        execPath: 'C:\\tools\\node\\node.exe',
        env: { Path: 'C:\\tools\\node' },
        existsSync: (path) => existing.has(path),
      }),
    ).toEqual({
      file: 'C:\\tools\\node\\node.exe',
      args: [
        'C:\\tools\\node\\node_modules\\npm\\bin\\npm-cli.js',
        'install',
        '--omit=dev',
      ],
    })
  })

  it('falls back to corepack.js when only corepack shim exists next to pnpm.cmd', () => {
    const existing = new Set([
      'C:\\tools\\node\\pnpm.cmd',
      'C:\\tools\\node\\node_modules\\corepack\\dist\\corepack.js',
    ])
    expect(
      resolvePackageManagerInvocation('pnpm', ['pack'], {
        platform: 'win32',
        execPath: 'C:\\tools\\node\\node.exe',
        env: { PATH: 'C:\\tools\\node' },
        existsSync: (path) => existing.has(path),
      }),
    ).toEqual({
      file: 'C:\\tools\\node\\node.exe',
      args: [
        'C:\\tools\\node\\node_modules\\corepack\\dist\\corepack.js',
        'pnpm',
        'pack',
      ],
    })
  })

  it('throws ENOENT when package manager cannot be resolved on Windows', () => {
    expect(() =>
      resolvePackageManagerInvocation('pnpm', ['--version'], {
        platform: 'win32',
        env: { PATH: 'C:\\empty' },
        existsSync: () => false,
      }),
    ).toThrow(
      expect.objectContaining({
        code: 'ENOENT',
      }),
    )
  })
})

describe('visual docker runner arguments', () => {
  it('includes HOST_UID/HOST_GID and chown when uid/gid are available', () => {
    const args = buildVisualDockerArgs({
      cwd: '/repo/ghostvue',
      uid: 1000,
      gid: 1000,
    })
    expect(args).toContain('/repo/ghostvue:/work')
    expect(args).toContain('HOST_UID=1000')
    expect(args).toContain('HOST_GID=1000')
    expect(args.at(-1)).toContain('chown -R "$HOST_UID:$HOST_GID"')
  })

  it('omits HOST_UID/HOST_GID and chown when uid/gid are unavailable (Windows)', () => {
    const args = buildVisualDockerArgs({
      cwd: 'C:\\repo\\ghostvue',
      uid: null,
      gid: null,
    })
    expect(args).toContain('C:\\repo\\ghostvue:/work')
    expect(args.some((arg) => arg.startsWith('HOST_UID='))).toBe(false)
    expect(args.at(-1)).not.toContain('chown')
    expect(args.at(-1)).toContain('pnpm test:visual:update')
  })
})
