/**
 * Installs packed workspace tarballs into an isolated consumer and imports
 * `@ghostvue/themes/define`. No workspace aliases or devDependency fallbacks.
 */
import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

import { workspacePackages } from './workspace-packages.mjs'

const root = fileURLToPath(new URL('..', import.meta.url))

/** Publish order for packed consumer installs (must match dependency chain). */
export const themesPackedSmokeOrder = workspacePackages.map(
  ({ directory }) => directory,
)

/** Marker files that `pnpm build` must emit before `pnpm pack` is meaningful. */
const builtArtifactMarkers = [
  'packages/shared/dist/index.js',
  'packages/core/dist/index.js',
  'packages/vue/dist/ghostvue.js',
  'packages/themes/dist/define.js',
]

/**
 * @returns {boolean} True when a workspace build already produced packable artifacts.
 */
export function ghostvuePackArtifactsPresent() {
  return builtArtifactMarkers.every((relative) =>
    existsSync(join(root, relative)),
  )
}

/**
 * @param {string} packDir
 * @param {string[]} [directories]
 * @returns {Promise<Record<string, string>>} Map of package name to absolute `.tgz` path.
 */
export async function packGhostvueTarballs(
  packDir,
  directories = themesPackedSmokeOrder,
) {
  /** @type {Record<string, string>} */
  const tarballs = {}

  for (const directory of directories) {
    const manifest = JSON.parse(
      await readFile(join(root, 'packages', directory, 'package.json'), 'utf8'),
    )
    const destination = join(packDir, directory)
    execFileSync('pnpm', ['pack', '--pack-destination', destination], {
      cwd: join(root, 'packages', directory),
      stdio: 'pipe',
    })
    const packed = await readdir(destination)
    const [archive] = packed.filter((file) => file.endsWith('.tgz'))
    if (!archive) {
      throw new Error(`pnpm pack produced no .tgz in ${destination}`)
    }
    tarballs[manifest.name] = join(destination, archive)
  }

  return tarballs
}

/**
 * @param {Record<string, string>} tarballs Absolute paths to packed `.tgz` files keyed by package name.
 * @returns {Record<string, string>} `package.json` dependency entries using `file:` specifiers.
 */
export function fileDependenciesFromTarballs(tarballs) {
  /** @type {Record<string, string>} */
  const dependencies = {}
  for (const [name, tarballPath] of Object.entries(tarballs)) {
    dependencies[name] = `file:${tarballPath}`
  }
  return dependencies
}

/**
 * Session cache: reuse pack output when smoke runs twice in one Node process (e.g. `exports:check`).
 * @type {{ packDir: string, tarballs: Record<string, string> } | null}
 */
let packedTarballSessionCache = null

/**
 * @param {{
 *   ensureBuilt?: boolean
 *   prepackedTarballs?: Record<string, string>
 *   profile?: boolean
 * }} [options]
 * When `ensureBuilt` is true, runs `pnpm build` only if pack artifacts are missing.
 * Pass `prepackedTarballs` to skip packing (same tarballs `exports:check` already created).
 * @returns {Promise<{ css: string, name: string, timings?: Record<string, number> }>}
 */
export async function runThemesDefinePackedSmoke(options = {}) {
  /** @type {Record<string, number>} */
  const timings = {}
  const mark = (label, start) => {
    timings[label] = Math.round(performance.now() - start)
  }

  let buildStart
  if (options.ensureBuilt && !ghostvuePackArtifactsPresent()) {
    buildStart = performance.now()
    execFileSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'pipe',
      env: {
        ...process.env,
        COREPACK_HOME: process.env.COREPACK_HOME ?? '/tmp/corepack',
      },
    })
    mark('buildMs', buildStart)
  } else if (options.ensureBuilt) {
    timings.buildMs = 0
    timings.buildSkipped = 1
  }

  let packStart
  /** @type {Record<string, string>} */
  let tarballs
  let packDir = null
  const requiredNames = workspacePackages.map((pkg) => pkg.name)
  const prepackedComplete =
    options.prepackedTarballs &&
    requiredNames.every((name) => options.prepackedTarballs[name])

  if (prepackedComplete) {
    tarballs = options.prepackedTarballs
    timings.packMs = 0
    timings.packReusedPrepacked = 1
  } else if (
    !options.prepackedTarballs &&
    packedTarballSessionCache &&
    requiredNames.every((name) => packedTarballSessionCache.tarballs[name])
  ) {
    tarballs = packedTarballSessionCache.tarballs
    timings.packMs = 0
    timings.packReusedSession = 1
  } else {
    packStart = performance.now()
    packDir = await mkdtemp(join(tmpdir(), 'ghostvue-themes-pack-'))
    tarballs = await packGhostvueTarballs(packDir)
    mark('packMs', packStart)
    if (!options.prepackedTarballs) {
      packedTarballSessionCache = { packDir, tarballs: { ...tarballs } }
    }
  }

  const consumerDir = await mkdtemp(join(tmpdir(), 'ghostvue-themes-consumer-'))

  try {
    const dependencies = fileDependenciesFromTarballs(tarballs)

    await writeFile(
      join(consumerDir, 'package.json'),
      `${JSON.stringify(
        {
          name: 'ghostvue-packed-define-consumer',
          private: true,
          type: 'module',
          dependencies: {
            ...dependencies,
            vue: '3.5.41',
          },
        },
        null,
        2,
      )}\n`,
    )

    const installStart = performance.now()
    // npm resolves every @ghostvue package from the file: tarballs (packed manifests still say 0.0.0).
    execFileSync(
      'npm',
      ['install', '--omit=dev', '--prefer-offline', '--no-audit', '--no-fund'],
      {
        cwd: consumerDir,
        stdio: 'pipe',
      },
    )
    mark('installMs', installStart)

    const runner = join(consumerDir, 'run.mjs')
    await writeFile(
      runner,
      `import { defineTheme } from '@ghostvue/themes/define'
const theme = defineTheme({ name: 'acme', primary: '#0f766e' })
if (!theme.css.includes('[data-ghost-theme=\\'acme\\']')) {
  throw new Error('defineTheme output missing theme scope')
}
console.log(JSON.stringify({ name: theme.name, cssLength: theme.css.length }))
`,
    )

    const runStart = performance.now()
    const output = execFileSync('node', [runner], {
      cwd: consumerDir,
      encoding: 'utf8',
    })
    mark('runMs', runStart)

    const parsed = JSON.parse(output.trim())
    if (parsed.name !== 'acme' || parsed.cssLength < 100) {
      throw new Error(`Unexpected defineTheme result: ${output}`)
    }

    if (options.profile) {
      timings.totalMs = Object.entries(timings).reduce((sum, [key, value]) => {
        if (key.endsWith('Skipped') || key.endsWith('Reused')) {
          return sum
        }
        return sum + (typeof value === 'number' ? value : 0)
      }, 0)
      console.error(`[themes-define-packed-smoke] ${JSON.stringify(timings)}`)
    }

    return {
      name: parsed.name,
      css: `length=${parsed.cssLength}`,
      ...(options.profile ? { timings } : {}),
    }
  } finally {
    await rm(consumerDir, { recursive: true, force: true })
    if (packDir && packDir !== packedTarballSessionCache?.packDir) {
      await rm(packDir, { recursive: true, force: true })
    }
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const ensureBuilt = process.argv.includes('--ensure-built')
    const profile = process.argv.includes('--profile')
    const result = await runThemesDefinePackedSmoke({ ensureBuilt, profile })
    console.log(`@ghostvue/themes/define packed smoke passed (${result.name}).`)
  } catch (error) {
    console.error(error instanceof Error ? error.message : error)
    process.exitCode = 1
  }
}
