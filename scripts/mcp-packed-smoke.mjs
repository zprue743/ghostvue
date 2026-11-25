#!/usr/bin/env node
/**
 * First-publish readiness gate for `@ghostvue/mcp` (GHO-232). Run after
 * `pnpm build`:
 *
 *   pnpm mcp:packed                 # part of `pnpm verify:build`
 *   node scripts/mcp-packed-smoke.mjs --ensure-built
 *
 * 1. Packs the package with `pnpm pack` and checks that the tarball holds
 *    `dist/` only (GHO-17 plan §4).
 * 2. Installs the tarball with `pnpm install --prod` into a scratch project
 *    outside the monorepo and gates the production `node_modules` size,
 *    excluding the bundled `dist/assets/`, at 18 MiB (plan §7). The report
 *    goes to stdout and, in GitHub Actions, the job summary.
 * 3. Starts the installed `ghostvue-mcp` bin over stdio with every proxy
 *    variable pointed at a closed local port, lists the five tools, and calls
 *    each one once (plan §9).
 *
 * Nothing is published; the package stays `"private": true`.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import {
  appendFile,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rm,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  apparentSize,
  evaluateInstallSize,
  publishedContentProblems,
  renderInstallSizeReport,
  runMcpStdioSmoke,
} from './lib/mcp-packed.js'
import { execPackageManagerSync } from './lib/package-manager.js'

const root = fileURLToPath(new URL('..', import.meta.url))
const packageDirectory = join(root, 'packages', 'mcp')

/**
 * An environment in which any proxy-aware network call fails fast, so the
 * smoke test shows the server answers from its bundle alone.
 *
 * @returns {NodeJS.ProcessEnv}
 */
function offlineEnv() {
  /** @type {NodeJS.ProcessEnv} */
  const env = {}
  for (const [key, value] of Object.entries(process.env)) {
    if (/^(https?|all|no)_proxy$/i.test(key)) continue
    env[key] = value
  }
  const closedPort = 'http://127.0.0.1:9'
  env.HTTP_PROXY = closedPort
  env.HTTPS_PROXY = closedPort
  env.ALL_PROXY = closedPort
  // Node 22.21+/24 route fetch and http(s) through these when set.
  env.NODE_USE_ENV_PROXY = '1'
  return env
}

const temporary = await mkdtemp(join(tmpdir(), 'ghostvue-mcp-packed-'))
try {
  if (!existsSync(join(packageDirectory, 'dist', 'assets', 'bundle.json'))) {
    if (!process.argv.includes('--ensure-built')) {
      throw new Error('@ghostvue/mcp is not built. Run `pnpm build` first.')
    }
    execPackageManagerSync('pnpm', ['build'], { cwd: root, stdio: 'pipe' })
  }

  // 1. Published contents.
  const packDirectory = join(temporary, 'pack')
  await mkdir(packDirectory)
  execPackageManagerSync(
    'pnpm',
    ['pack', '--pack-destination', packDirectory],
    { cwd: packageDirectory, stdio: 'pipe' },
  )
  const [archive] = (await readdir(packDirectory)).filter((file) =>
    file.endsWith('.tgz'),
  )
  if (!archive) throw new Error('pnpm pack produced no @ghostvue/mcp tarball')
  const tarball = join(packDirectory, archive)
  const entries = execFileSync('tar', ['-tzf', archive], {
    cwd: packDirectory,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  })
    .split(/\r?\n/)
    .filter(Boolean)
  const contentProblems = publishedContentProblems(entries)
  if (contentProblems.length) {
    throw new Error(
      `@ghostvue/mcp tarball contents:\n- ${contentProblems.join('\n- ')}`,
    )
  }
  console.log(
    `Packed ${archive}: ${String(entries.length)} entries, dist/ only.`,
  )

  // 2. Installed size of a consumer's production install.
  const consumer = join(temporary, 'consumer')
  await mkdir(consumer)
  await writeFile(
    join(consumer, 'package.json'),
    `${JSON.stringify(
      {
        name: 'ghostvue-mcp-packed-consumer',
        private: true,
        dependencies: { '@ghostvue/mcp': `file:${tarball}` },
      },
      null,
      2,
    )}\n`,
  )
  // No lockfile: the consumer resolves dependency ranges as a real install
  // would. `CI` makes pnpm default to a frozen lockfile, so opt out.
  execPackageManagerSync(
    'pnpm',
    [
      'install',
      '--prod',
      '--ignore-scripts',
      '--ignore-workspace',
      '--no-frozen-lockfile',
    ],
    { cwd: consumer, stdio: 'pipe' },
  )
  const nodeModules = join(consumer, 'node_modules')
  const installed = await realpath(join(nodeModules, '@ghostvue', 'mcp'))
  const assets = join(installed, 'dist', 'assets')
  const totalBytes = await apparentSize(nodeModules)
  const assetBytes = await apparentSize(assets)
  const packageCount = (
    await readdir(join(nodeModules, '.pnpm'), { withFileTypes: true })
  ).filter(
    (entry) => entry.isDirectory() && entry.name !== 'node_modules',
  ).length
  const measurement = { totalBytes, assetBytes, packageCount }
  const report = renderInstallSizeReport(measurement)
  console.log(`\n${report}`)
  if (process.env.GITHUB_STEP_SUMMARY) {
    await appendFile(process.env.GITHUB_STEP_SUMMARY, `${report}\n`)
  }
  if (!evaluateInstallSize(measurement).withinBudget) {
    throw new Error('@ghostvue/mcp production node_modules exceed 18 MiB.')
  }

  // 3. Stdio smoke test of the installed bin.
  const { assetBundleId } = JSON.parse(
    await readFile(join(assets, 'bundle.json'), 'utf8'),
  )
  const bin = join(installed, 'dist', 'bin.js')
  const smoke = await runMcpStdioSmoke({
    // The `.bin` shim exercises the `bin` link and shebang; Windows shims are
    // `.cmd` files that `spawn` cannot run without a shell.
    ...(process.platform === 'win32'
      ? { command: process.execPath, args: [bin] }
      : { command: join(nodeModules, '.bin', 'ghostvue-mcp') }),
    // Outside the monorepo, so nothing but the installed package is readable
    // by relative path.
    cwd: consumer,
    env: offlineEnv(),
    assetBundleId,
  })
  console.log(
    `ghostvue-mcp stdio smoke passed offline: listed ${smoke.tools.join(', ')}; called ${smoke.calls.join(', ')}.`,
  )
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await rm(temporary, { recursive: true, force: true })
}
