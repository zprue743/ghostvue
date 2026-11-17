import { execFile, execFileSync } from 'node:child_process'
import { existsSync as nodeExistsSync } from 'node:fs'
import { delimiter, win32 } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const PACKAGE_MANAGER_ENTRYPOINTS = {
  pnpm: [
    ['node_modules', 'pnpm', 'bin', 'pnpm.mjs'],
    ['node_modules', 'pnpm', 'bin', 'pnpm.cjs'],
    ['node_modules', 'pnpm', 'bin', 'pnpm.js'],
  ],
  npm: [['node_modules', 'npm', 'bin', 'npm-cli.js']],
}

/**
 * Resolve `pnpm` or `npm` into a direct executable + argv pair for `execFile` /
 * `execFileSync` without invoking a shell (avoiding `cmd.exe` quoting and
 * command-string injection on Windows).
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {{
 *   platform?: NodeJS.Platform
 *   env?: NodeJS.ProcessEnv
 *   execPath?: string
 *   existsSync?: (path: string) => boolean
 *   pathDelimiter?: string
 * }} [options]
 * @returns {{ file: string, args: string[] }}
 */
export function resolvePackageManagerInvocation(
  command,
  args = [],
  options = {},
) {
  const platform = options.platform ?? process.platform
  const env = options.env ?? process.env
  const execPath = options.execPath ?? process.execPath
  const existsSync = options.existsSync ?? nodeExistsSync

  if (platform !== 'win32' || (command !== 'pnpm' && command !== 'npm')) {
    return { file: command, args: [...args] }
  }

  if (
    command === 'pnpm' &&
    typeof env.npm_execpath === 'string' &&
    /(?:^|[\\/])pnpm\.(?:c|m)?js$/i.test(env.npm_execpath) &&
    existsSync(env.npm_execpath)
  ) {
    return { file: execPath, args: [env.npm_execpath, ...args] }
  }

  const rawPath = env.PATH ?? env.Path ?? ''
  const pathDelimiter =
    options.pathDelimiter ?? (platform === 'win32' ? ';' : delimiter)
  const pathEntries = rawPath
    .split(pathDelimiter)
    .map((entry) => entry.trim().replace(/^"(.*)"$/, '$1'))
    .filter(Boolean)

  for (const directory of pathEntries) {
    const exePath = win32.join(directory, `${command}.exe`)
    if (existsSync(exePath)) {
      return { file: exePath, args: [...args] }
    }

    const cmdPath = win32.join(directory, `${command}.cmd`)
    if (!existsSync(cmdPath)) continue

    for (const segments of PACKAGE_MANAGER_ENTRYPOINTS[command]) {
      const cliPath = win32.join(directory, ...segments)
      if (existsSync(cliPath)) {
        return { file: execPath, args: [cliPath, ...args] }
      }
    }

    const corepackPath = win32.join(
      directory,
      'node_modules',
      'corepack',
      'dist',
      'corepack.js',
    )
    if (existsSync(corepackPath)) {
      return { file: execPath, args: [corepackPath, command, ...args] }
    }
  }

  /** @type {NodeJS.ErrnoException} */
  const error = new Error(
    `Could not resolve ${command} executable or Node CLI entrypoint on Windows.`,
  )
  error.code = 'ENOENT'
  throw error
}

/**
 * Execute `pnpm` or `npm` synchronously without a shell.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {import('node:child_process').ExecFileSyncOptions} [execOptions]
 */
export function execPackageManagerSync(command, args = [], execOptions = {}) {
  const { file, args: resolvedArgs } = resolvePackageManagerInvocation(
    command,
    args,
  )
  return execFileSync(file, resolvedArgs, execOptions)
}

/**
 * Execute `pnpm` or `npm` asynchronously without a shell.
 *
 * @param {string} command
 * @param {string[]} [args]
 * @param {import('node:child_process').ExecFileOptions} [execOptions]
 */
export async function execPackageManager(command, args = [], execOptions = {}) {
  const { file, args: resolvedArgs } = resolvePackageManagerInvocation(
    command,
    args,
  )
  return execFileAsync(file, resolvedArgs, execOptions)
}
