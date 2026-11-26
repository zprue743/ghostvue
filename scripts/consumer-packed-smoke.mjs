#!/usr/bin/env node
/**
 * Packed-tarball consumer smoke test for the 0.1.0 release train (GHO-217).
 * Run after `pnpm build`:
 *
 *   pnpm consumer:packed            # part of `pnpm verify:build`
 *   node scripts/consumer-packed-smoke.mjs --ensure-built
 *
 * Packs every publishable package with `pnpm pack` and installs the tarballs
 * with npm into scratch projects outside the monorepo (no workspace links or
 * aliases), copied from `tests/fixtures/consumer-packed/`:
 *
 * 1. `@ghostvue/vue` + `@ghostvue/themes`: a Vite + Vue app with themed
 *    Field, Input, Select, Dialog, Drawer, and Toast, set up exactly as the
 *    getting-started guide documents (only the flagship `calm.css` imported
 *    explicitly; the base stylesheet comes from importing `@ghostvue/themes`).
 *    Its production build must emit the `@layer ghostvue-theme` base recipes
 *    and the calm token host, and the built bundle is mounted in jsdom and
 *    driven once per component.
 * 2. `@ghostvue/nuxt`: a Nuxt app that uses only module auto-imports. The
 *    headless default is built and server-rendered; the themed opt-in is
 *    prepared and must resolve tags to `@ghostvue/themes`.
 * 3. `@ghostvue/eslint-plugin`: ESLint flags an invalid `Ghost*` usage with
 *    every rule and passes a valid one.
 *
 * `@ghostvue/mcp` has its own packed check, `pnpm mcp:packed`, which starts
 * the installed bin over stdio, calls every tool (including `list_components`
 * and `get_component`), and checks the `manifestSchemaId` stamp.
 *
 * Consumers need the npm registry for third-party dependencies, pinned to the
 * workspace's versions. Nothing is published.
 */
import { execFileSync, spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import { cp, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

import {
  consumerDependencyPins,
  eslintConsumerProblems,
  nuxtAutoImportProblems,
  nuxtComponentSources,
  nuxtImportSources,
  nuxtPageProblems,
  themedBuildCssProblems,
  viteAppMountProblems,
} from './lib/consumer-packed.js'
import { execPackageManagerSync } from './lib/package-manager.js'
import { ensureWorkspaceBuilt } from './lib/workspace-build-lock.js'
import { packGhostvueTarballs } from './themes-define-packed-smoke.mjs'
import { publishableWorkspacePackages } from './workspace-packages.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))
const fixtures = join(root, 'tests', 'fixtures', 'consumer-packed')

/** Files `pnpm build` emits that the packed consumers load. */
const builtArtifactMarkers = [
  'packages/vue/dist/ghostvue.js',
  'packages/themes/dist/index.js',
  'packages/nuxt/dist/index.js',
  'packages/eslint-plugin/dist/index.js',
]

/**
 * @param {string} message
 * @param {string[]} problems
 */
function assertNoProblems(message, problems) {
  if (problems.length > 0) {
    throw new Error(`${message}:\n- ${problems.join('\n- ')}`)
  }
}

/**
 * Copy a fixture into a fresh scratch directory and install it with npm.
 *
 * @param {string} temporary
 * @param {string} fixture Directory name under `tests/fixtures/consumer-packed/`.
 * @param {Record<string, string>} dependencies
 */
async function installConsumer(temporary, fixture, dependencies) {
  const directory = join(temporary, fixture)
  await cp(join(fixtures, fixture), directory, { recursive: true })
  await writeFile(
    join(directory, 'package.json'),
    `${JSON.stringify(
      {
        name: `ghostvue-packed-${fixture}-consumer`,
        private: true,
        type: 'module',
        dependencies,
      },
      null,
      2,
    )}\n`,
  )
  // No lockfile, as a fresh consumer would install. npm resolves each
  // `@ghostvue/*` name, including peer and internal ranges, from the file:
  // tarballs at the top level (packed manifests still say 0.0.0).
  execPackageManagerSync('npm', ['install', '--no-audit', '--no-fund'], {
    cwd: directory,
    stdio: 'pipe',
  })
  return directory
}

/**
 * Run a consumer-installed CLI with this Node binary (no shell, no `.bin` shim).
 *
 * @param {string} cwd
 * @param {string} bin Path relative to `cwd`.
 * @param {string[]} args
 * @param {NodeJS.ProcessEnv} [env]
 */
function runConsumerBin(cwd, bin, args, env = process.env) {
  return execFileSync(process.execPath, [join(cwd, bin), ...args], {
    cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
}

/**
 * @param {string} temporary
 * @param {Record<string, string>} tarballs
 * @param {Record<string, string>} pins
 */
async function checkViteApp(temporary, tarballs, pins) {
  const app = await installConsumer(temporary, 'vite-app', {
    '@ghostvue/vue': `file:${tarballs['@ghostvue/vue']}`,
    '@ghostvue/themes': `file:${tarballs['@ghostvue/themes']}`,
    vue: pins.vue,
    vite: pins.vite,
    '@vitejs/plugin-vue': pins['@vitejs/plugin-vue'],
    jsdom: pins.jsdom,
  })
  runConsumerBin(app, 'node_modules/vite/bin/vite.js', ['build'], {
    ...process.env,
    NODE_ENV: 'production',
  })
  const assets = await readdir(join(app, 'dist', 'assets'))
  const css = (
    await Promise.all(
      assets
        .filter((file) => file.endsWith('.css'))
        .map((file) => readFile(join(app, 'dist', 'assets', file), 'utf8')),
    )
  ).join('\n')
  assertNoProblems(
    'The Vite consumer production build emitted incomplete theme CSS',
    themedBuildCssProblems(css, { flagship: 'calm' }),
  )
  const output = execFileSync(process.execPath, ['mount.mjs'], {
    cwd: app,
    encoding: 'utf8',
  })
  const lastLine = output.trim().split('\n').pop() ?? ''
  assertNoProblems(
    'Mounting the packed Vite + Vue consumer failed',
    viteAppMountProblems(JSON.parse(lastLine)),
  )
  console.log(
    'Vite + Vue consumer: production build of the documented setup emitted @layer ghostvue-theme base and calm CSS; mounted Field, Input, Select, Dialog, Drawer, and Toast in jsdom.',
  )
}

/**
 * Start the Nitro server of a Nuxt build on a free port and fetch `/`.
 *
 * @param {string} app
 * @returns {Promise<string>}
 */
async function fetchNuxtPage(app) {
  const server = spawn(
    process.execPath,
    [join(app, '.output', 'server', 'index.mjs')],
    {
      cwd: app,
      env: { ...process.env, HOST: '127.0.0.1', PORT: '0', NITRO_PORT: '0' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  )
  let stderr = ''
  server.stderr.setEncoding('utf8')
  server.stderr.on('data', (chunk) => (stderr += chunk))
  try {
    const url = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Nuxt server did not start:\n${stderr}`))
      }, 30_000)
      server.once('exit', (code) => {
        clearTimeout(timer)
        reject(new Error(`Nuxt server exited with ${String(code)}:\n${stderr}`))
      })
      createInterface({ input: server.stdout }).on('line', (line) => {
        const match = /https?:\/\/[^\s]+/.exec(line)
        if (match) {
          clearTimeout(timer)
          resolve(match[0])
        }
      })
    })
    // Loopback only; Node's fetch ignores proxy variables unless told not to.
    const response = await fetch(String(url))
    if (!response.ok) {
      throw new Error(`GET ${String(url)} returned ${String(response.status)}`)
    }
    return await response.text()
  } finally {
    server.kill()
  }
}

/**
 * @param {string} app
 * @param {'headless' | 'themed'} variant
 */
async function readNuxtAutoImports(app, variant) {
  const buildDir = join(app, '.nuxt', variant)
  return {
    components: nuxtComponentSources(
      await readFile(join(buildDir, 'components.d.ts'), 'utf8'),
    ),
    imports: nuxtImportSources(
      await readFile(join(buildDir, 'imports.d.ts'), 'utf8'),
    ),
  }
}

/**
 * @param {string} temporary
 * @param {Record<string, string>} tarballs
 * @param {Record<string, string>} pins
 */
async function checkNuxtApp(temporary, tarballs, pins) {
  const app = await installConsumer(temporary, 'nuxt-app', {
    '@ghostvue/nuxt': `file:${tarballs['@ghostvue/nuxt']}`,
    '@ghostvue/vue': `file:${tarballs['@ghostvue/vue']}`,
    '@ghostvue/themes': `file:${tarballs['@ghostvue/themes']}`,
    nuxt: pins.nuxt,
    vue: pins.vue,
  })
  const nuxtBin = 'node_modules/nuxt/bin/nuxt.mjs'
  const env = { ...process.env, NUXT_TELEMETRY_DISABLED: '1' }

  runConsumerBin(app, nuxtBin, ['build'], {
    ...env,
    GHOSTVUE_SMOKE_VARIANT: 'headless',
  })
  assertNoProblems(
    'The headless @ghostvue/nuxt consumer generated wrong auto-imports',
    nuxtAutoImportProblems({
      ...(await readNuxtAutoImports(app, 'headless')),
      componentPackage: '@ghostvue/vue',
    }),
  )
  assertNoProblems(
    'The headless @ghostvue/nuxt consumer rendered wrong HTML',
    nuxtPageProblems(await fetchNuxtPage(app)),
  )

  runConsumerBin(app, nuxtBin, ['prepare'], {
    ...env,
    GHOSTVUE_SMOKE_VARIANT: 'themed',
  })
  assertNoProblems(
    'The themed @ghostvue/nuxt consumer generated wrong auto-imports',
    nuxtAutoImportProblems({
      ...(await readNuxtAutoImports(app, 'themed')),
      componentPackage: '@ghostvue/themes',
    }),
  )
  console.log(
    'Nuxt consumer: headless auto-imports built and server-rendered; themed opt-in resolves to @ghostvue/themes.',
  )
}

/**
 * @param {string} temporary
 * @param {Record<string, string>} tarballs
 * @param {Record<string, string>} pins
 */
async function checkEslintConsumer(temporary, tarballs, pins) {
  const project = await installConsumer(temporary, 'eslint', {
    '@ghostvue/eslint-plugin': `file:${tarballs['@ghostvue/eslint-plugin']}`,
    eslint: pins.eslint,
    'vue-eslint-parser': pins['vue-eslint-parser'],
  })
  let output
  try {
    output = runConsumerBin(project, 'node_modules/eslint/bin/eslint.js', [
      '--format',
      'json',
      'src',
    ])
  } catch (error) {
    // Exit code 1 means lint errors were found, which Invalid.vue must have.
    const failure =
      /** @type {{ status?: number, stdout?: string, stderr?: string }} */ (
        error
      )
    if (failure.status !== 1 || !failure.stdout) {
      throw new Error(`ESLint failed to run:\n${String(failure.stderr)}`, {
        cause: error,
      })
    }
    output = failure.stdout
  }
  assertNoProblems(
    'The packed @ghostvue/eslint-plugin consumer reported wrong results',
    eslintConsumerProblems(JSON.parse(output)),
  )
  console.log(
    'ESLint consumer: invalid Ghost* usage flagged by all three rules; valid usage passes.',
  )
}

const temporary = await mkdtemp(join(tmpdir(), 'ghostvue-consumer-packed-'))
try {
  const missing = builtArtifactMarkers.filter(
    (relative) => !existsSync(join(root, relative)),
  )
  if (missing.length > 0) {
    if (!process.argv.includes('--ensure-built')) {
      throw new Error(
        `Publishable packages are not built (${missing.join(', ')}). Run \`pnpm build\` first.`,
      )
    }
    ensureWorkspaceBuilt({
      root,
      isBuilt: () =>
        builtArtifactMarkers.every((relative) =>
          existsSync(join(root, relative)),
        ),
      build: () =>
        execPackageManagerSync('pnpm', ['build'], { cwd: root, stdio: 'pipe' }),
    })
  }

  const tarballs = await packGhostvueTarballs(
    join(temporary, 'pack'),
    publishableWorkspacePackages.map(({ directory }) => directory),
  )
  const pins = await consumerDependencyPins(root)

  await checkViteApp(temporary, tarballs, pins)
  await checkNuxtApp(temporary, tarballs, pins)
  await checkEslintConsumer(temporary, tarballs, pins)
  console.log('Packed consumer smoke passed. Nothing was published.')
} catch (error) {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
} finally {
  await rm(temporary, { recursive: true, force: true })
}
