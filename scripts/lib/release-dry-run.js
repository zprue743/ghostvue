/**
 * Credential-free release dry run for the publishable `@ghostvue/*` packages.
 *
 * Real publication is deliberately impossible from this module (GHO-57). The
 * maintainer authorized building and validating the release pipeline, not
 * publishing, so every safety property here is layered rather than relying on
 * a single flag:
 *
 * 1. Callers must opt in with `--dry-run`; anything that looks like a request
 *    to publish for real is refused before any work starts.
 * 2. The only npm subcommands this module can spawn are `pack` and
 *    `publish --dry-run`, checked immediately before every spawn.
 * 3. Child npm processes run with an empty user config, no auth tokens, no
 *    GitHub OIDC request variables (npm trusted publishing can mint publish
 *    credentials from those), and a registry on the reserved `.invalid` TLD,
 *    so even a bypassed dry-run flag would have nothing to authenticate with
 *    and nowhere to upload.
 * 4. Source manifests stay `private: true`. Only a temporary staged copy of each
 *    packed tarball drops `private` so npm validates the manifest exactly as it
 *    would for the authorized release.
 *
 * Versions come from running `changeset version` inside a scratch copy of the
 * workspace manifests, so the dry run previews the same release plan Changesets
 * would apply without touching the checkout.
 */
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { execPackageManagerSync } from './package-manager.js'

const toolingRoot = fileURLToPath(new URL('../..', import.meta.url))

/**
 * Registry used for every child npm process. `.invalid` is reserved by RFC 2606
 * and never resolves, so an accidental non-dry-run publish cannot reach npm.
 */
export const DRY_RUN_REGISTRY = 'https://registry.invalid/'

/** Expected `repository.url` for npm provenance (must match the GitHub repo). */
export const REPOSITORY_URL = 'git+https://github.com/zprue743/ghostvue.git'

export const DEFAULT_EVIDENCE_DIRECTORY = 'reports/release-dry-run'

/** Thrown when an invocation could publish or bypass the dry-run guard. */
export class ReleaseSafetyError extends Error {
  /** @param {string} message */
  constructor(message) {
    super(`REFUSING TO PUBLISH: ${message}`)
    this.name = 'ReleaseSafetyError'
  }
}

// Flags that signal intent to publish for real. `--dry-run=false` is how npm
// and many CLIs negate the flag, so it is treated as a publish request too.
const forbiddenArguments = new Set([
  '--publish',
  '--no-dry-run',
  '--dry-run=false',
  '--force-publish',
])

/**
 * Parse CLI arguments and refuse anything that is not an explicit dry run.
 *
 * @param {string[]} argv
 * @returns {{ outDir: string, expectVersion: string | null, verifyEvidence: string | null }}
 */
export function parseReleaseDryRunArgs(argv) {
  const forbidden = argv.find(
    (argument) =>
      forbiddenArguments.has(argument) || argument.startsWith('--otp'),
  )
  if (forbidden) {
    throw new ReleaseSafetyError(
      `"${forbidden}" requests a real publication. Publishing requires separate explicit maintainer authorization and is not implemented by this script.`,
    )
  }
  if (!argv.includes('--dry-run')) {
    throw new ReleaseSafetyError(
      'pass --dry-run. This script only performs credential-free dry runs.',
    )
  }

  /** @type {{ outDir: string, expectVersion: string | null, verifyEvidence: string | null }} */
  const options = {
    outDir: DEFAULT_EVIDENCE_DIRECTORY,
    expectVersion: null,
    verifyEvidence: null,
  }
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index]
    if (argument === '--dry-run') continue
    const value = argv[index + 1]
    if (
      argument === '--out' ||
      argument === '--expect-version' ||
      argument === '--verify-evidence'
    ) {
      if (!value || value.startsWith('--')) {
        throw new Error(`${argument} requires a value`)
      }
      index += 1
      if (argument === '--out') options.outDir = value
      if (argument === '--expect-version') options.expectVersion = value
      if (argument === '--verify-evidence') options.verifyEvidence = value
      continue
    }
    throw new Error(`Unknown argument: ${argument}`)
  }
  return options
}

/**
 * Throw unless `args` is an npm invocation that cannot publish.
 *
 * @param {string[]} args
 */
export function assertSafeNpmArgs(args) {
  const [subcommand] = args
  if (subcommand === 'pack') return
  if (subcommand !== 'publish') {
    throw new ReleaseSafetyError(
      `npm ${String(subcommand)} is not an allowed release dry-run command`,
    )
  }
  if (!args.includes('--dry-run')) {
    throw new ReleaseSafetyError('npm publish was invoked without --dry-run')
  }
  const forbidden = args.find((argument) => forbiddenArguments.has(argument))
  if (forbidden) {
    throw new ReleaseSafetyError(`npm publish was invoked with ${forbidden}`)
  }
}

/**
 * Build a child environment for npm with no way to authenticate or reach the
 * public registry.
 *
 * @param {NodeJS.ProcessEnv} baseEnv
 * @param {string} userconfigPath Path to an empty npmrc.
 * @param {string} globalconfigPath Path to a second, distinct empty npmrc.
 * @returns {NodeJS.ProcessEnv}
 */
export function createIsolatedNpmEnv(
  baseEnv,
  userconfigPath,
  globalconfigPath,
) {
  /** @type {NodeJS.ProcessEnv} */
  const env = {}
  for (const [key, value] of Object.entries(baseEnv)) {
    const lower = key.toLowerCase()
    if (lower === 'node_auth_token' || lower === 'npm_token') continue
    // npm reads any `npm_config_*` variable as configuration, including
    // registry-scoped `//host/:_authToken` credentials and alternate npmrc paths.
    if (lower.startsWith('npm_config_')) continue
    // npm >= 11.5 trusted publishing exchanges a GitHub OIDC token for a
    // short-lived publish credential, so the request variables count as secrets.
    if (lower.startsWith('actions_id_token_request')) continue
    env[key] = value
  }
  env.npm_config_userconfig = userconfigPath
  env.npm_config_globalconfig = globalconfigPath
  env.npm_config_registry = DRY_RUN_REGISTRY
  env.npm_config_dry_run = 'true'
  env.npm_config_audit = 'false'
  env.npm_config_fund = 'false'
  env.npm_config_update_notifier = 'false'
  return env
}

/**
 * Check the source manifest invariants that keep a package unpublishable until
 * an authorized release PR flips them.
 *
 * @param {Record<string, unknown>} manifest
 * @param {string} directory Package directory relative to the repository root.
 * @returns {string[]} Human-readable problems; empty when safe.
 */
export function sourceManifestProblems(manifest, directory) {
  const name = String(manifest.name)
  /** @type {string[]} */
  const problems = []
  if (!name.startsWith('@ghostvue/')) {
    problems.push(`${name} is not in the @ghostvue scope`)
  }
  if (manifest.private !== true) {
    problems.push(
      `${name} must stay "private": true until a maintainer explicitly authorizes publication`,
    )
  }
  const publishConfig = /** @type {Record<string, unknown> | undefined} */ (
    manifest.publishConfig
  )
  if (publishConfig?.access !== 'public') {
    problems.push(
      `${name} needs publishConfig.access "public" (scoped package)`,
    )
  }
  if (publishConfig?.provenance !== true) {
    problems.push(`${name} needs publishConfig.provenance true`)
  }
  if (publishConfig?.registry !== undefined) {
    problems.push(`${name} must not override publishConfig.registry`)
  }
  const repository = /** @type {Record<string, unknown> | undefined} */ (
    manifest.repository
  )
  if (repository?.url !== REPOSITORY_URL) {
    problems.push(
      `${name} repository.url must be ${REPOSITORY_URL} for npm provenance`,
    )
  }
  if (repository?.directory !== directory) {
    problems.push(`${name} repository.directory must be ${directory}`)
  }
  return problems
}

const dependencyFields = /** @type {const} */ ([
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
])

/**
 * Turn a packed manifest into the manifest the authorized release would
 * publish: planned version, exact internal versions, and no `private` flag.
 * Returns a new object; the input is not mutated.
 *
 * @param {Record<string, unknown>} packedManifest
 * @param {Map<string, string>} plannedVersions Planned version by package name.
 * @returns {Record<string, unknown>}
 */
export function stagePublishManifest(packedManifest, plannedVersions) {
  const name = String(packedManifest.name)
  const version = plannedVersions.get(name)
  if (!version) {
    throw new Error(`No planned version for ${name}`)
  }
  /** @type {Record<string, unknown>} */
  const staged = structuredClone(packedManifest)
  delete staged.private
  staged.version = version
  for (const field of dependencyFields) {
    const dependencies = /** @type {Record<string, string> | undefined} */ (
      staged[field]
    )
    if (!dependencies) continue
    for (const [dependency, range] of Object.entries(dependencies)) {
      if (range.startsWith('workspace:')) {
        throw new Error(
          `${name} still has an unresolved ${dependency}@${range} after packing`,
        )
      }
      if (!dependency.startsWith('@ghostvue/')) continue
      const dependencyVersion = plannedVersions.get(dependency)
      if (!dependencyVersion) {
        throw new Error(
          `${name} depends on ${dependency}, which is not part of the release`,
        )
      }
      // pnpm rewrites `workspace:*` to the exact sibling version at publish
      // time; mirror that with the planned version.
      dependencies[dependency] = dependencyVersion
    }
  }
  return staged
}

/**
 * Read workspace package directories from `pnpm-workspace.yaml`. Only the
 * `dir/*` and literal directory forms used by this repository are supported;
 * anything else fails loudly instead of silently skipping packages.
 *
 * @param {string} root
 * @returns {Promise<string[]>} Directories relative to `root`.
 */
async function listWorkspaceDirectories(root) {
  const workspace = await readFile(join(root, 'pnpm-workspace.yaml'), 'utf8')
  /** @type {string[]} */
  const patterns = []
  let inPackages = false
  for (const line of workspace.split(/\r?\n/)) {
    if (/^packages:\s*$/.test(line)) {
      inPackages = true
      continue
    }
    if (!inPackages) continue
    const match = /^\s+-\s+['"]?([^'"#\s]+)['"]?\s*$/.exec(line)
    if (match) {
      patterns.push(match[1])
      continue
    }
    if (/^\S/.test(line)) break
  }

  /** @type {string[]} */
  const directories = []
  for (const pattern of patterns) {
    if (pattern.endsWith('/*')) {
      const parent = pattern.slice(0, -2)
      if (parent.includes('*')) {
        throw new Error(`Unsupported workspace pattern: ${pattern}`)
      }
      const entries = await readdir(join(root, parent), {
        withFileTypes: true,
      }).catch(() => [])
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const directory = `${parent}/${entry.name}`
        const exists = await stat(join(root, directory, 'package.json')).then(
          () => true,
          () => false,
        )
        if (exists) directories.push(directory)
      }
    } else if (pattern.includes('*') || pattern.startsWith('!')) {
      throw new Error(`Unsupported workspace pattern: ${pattern}`)
    } else {
      directories.push(pattern)
    }
  }
  return directories
}

/**
 * Run `changeset version` in a scratch copy containing only the workspace
 * manifests and `.changeset/`, then read back the planned versions and
 * changelog previews. The checkout is never modified.
 *
 * @param {string} root
 * @param {string} scratch Empty temporary directory.
 */
export async function planReleaseVersions(root, scratch) {
  const workspaceDirectories = await listWorkspaceDirectories(root)
  await cp(join(root, 'package.json'), join(scratch, 'package.json'))
  await cp(
    join(root, 'pnpm-workspace.yaml'),
    join(scratch, 'pnpm-workspace.yaml'),
  )
  await cp(join(root, '.changeset'), join(scratch, '.changeset'), {
    recursive: true,
  })
  for (const directory of workspaceDirectories) {
    await mkdir(join(scratch, directory), { recursive: true })
    await cp(
      join(root, directory, 'package.json'),
      join(scratch, directory, 'package.json'),
    )
  }

  // The scratch tree has no node_modules, so point the changelog generator at
  // the repository's installed module instead of a bare specifier.
  const require = createRequire(join(toolingRoot, 'package.json'))
  const configPath = join(scratch, '.changeset', 'config.json')
  const config = JSON.parse(await readFile(configPath, 'utf8'))
  if (config.changelog === '@changesets/cli/changelog') {
    config.changelog = require.resolve('@changesets/cli/changelog')
  }
  // Committing from the scratch tree would target the enclosing repository.
  config.commit = false
  await writeFile(configPath, `${JSON.stringify(config, null, 2)}\n`)

  const changesetBin = require.resolve('@changesets/cli/bin.js')
  execFileSync(process.execPath, [changesetBin, 'version'], {
    cwd: scratch,
    stdio: 'pipe',
    env: { ...process.env, CI: 'true' },
  })

  /** @type {Map<string, { directory: string, before: string, after: string, changelog: string | null }>} */
  const plan = new Map()
  for (const directory of workspaceDirectories) {
    const before = JSON.parse(
      await readFile(join(root, directory, 'package.json'), 'utf8'),
    )
    const after = JSON.parse(
      await readFile(join(scratch, directory, 'package.json'), 'utf8'),
    )
    const changelog = await readFile(
      join(scratch, directory, 'CHANGELOG.md'),
      'utf8',
    ).catch(() => null)
    plan.set(String(after.name), {
      directory,
      before: String(before.version),
      after: String(after.version),
      changelog,
    })
  }
  return plan
}

/**
 * @param {string} file
 * @returns {Promise<string>}
 */
async function sha1(file) {
  return createHash('sha1')
    .update(await readFile(file))
    .digest('hex')
}

/**
 * @param {string[]} args
 * @param {{ cwd: string, env: NodeJS.ProcessEnv }} options
 * @returns {string} stdout
 */
function runGuardedNpm(args, options) {
  assertSafeNpmArgs(args)
  // `npm_config_dry_run` also turns `npm pack` into a no-op, so only `pack`
  // (which cannot publish) runs without it.
  const env = { ...options.env }
  if (args[0] === 'pack') delete env.npm_config_dry_run
  const stdout = execPackageManagerSync('npm', args, {
    cwd: options.cwd,
    env,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    maxBuffer: 64 * 1024 * 1024,
  })
  return String(stdout)
}

/**
 * npm prints lifecycle noise before JSON on some versions; take the last
 * top-level JSON value.
 *
 * @param {string} output
 * @returns {Record<string, unknown>}
 */
function parseNpmJson(output) {
  const start = output.indexOf('{')
  const startArray = output.indexOf('[')
  const index =
    startArray !== -1 && (start === -1 || startArray < start)
      ? startArray
      : start
  if (index === -1) throw new Error(`npm produced no JSON:\n${output}`)
  const parsed = JSON.parse(output.slice(index))
  const value = Array.isArray(parsed) ? parsed[0] : parsed
  // npm 11 keys `publish --json` output by package name.
  if (value && typeof value === 'object' && !('id' in value)) {
    const [nested] = Object.values(value)
    if (nested && typeof nested === 'object') return nested
  }
  return value
}

/**
 * `publishable: false` marks an internal workspace package that is never
 * released; it is refused rather than silently dry-run.
 *
 * @typedef {{ directory: string, name: string, publishable?: boolean }} ReleasePackage
 */

/**
 * Pack, stage, and dry-run publish each package, writing evidence to `outDir`.
 *
 * @param {{
 *   root: string
 *   packages: readonly ReleasePackage[]
 *   outDir: string
 *   expectVersion?: string | null
 *   log?: (message: string) => void
 * }} options
 */
export async function runReleaseDryRun(options) {
  const { root, packages, expectVersion = null } = options
  const log =
    options.log ??
    (() => {
      // Silent unless the caller wants progress output.
    })
  const outDir = resolve(root, options.outDir)
  const temporary = await mkdtemp(join(tmpdir(), 'ghostvue-release-'))

  try {
    /** @type {string[]} */
    const problems = []
    /** @type {Map<string, Record<string, unknown>>} */
    const sourceManifests = new Map()
    for (const { directory, name, publishable } of packages) {
      if (publishable === false) {
        problems.push(
          `${name} is an internal package (publishable: false) and is not part of the release`,
        )
        continue
      }
      const manifest = JSON.parse(
        await readFile(
          join(root, 'packages', directory, 'package.json'),
          'utf8',
        ),
      )
      if (manifest.name !== name) {
        problems.push(`packages/${directory} is ${manifest.name}, not ${name}`)
      }
      problems.push(
        ...sourceManifestProblems(manifest, `packages/${directory}`),
      )
      sourceManifests.set(name, manifest)
    }
    if (problems.length) {
      throw new Error(`Release manifest problems:\n- ${problems.join('\n- ')}`)
    }

    log('Planning versions with `changeset version` in a scratch copy…')
    const scratch = join(temporary, 'changeset-scratch')
    await mkdir(scratch)
    const plan = await planReleaseVersions(root, scratch)

    /** @type {Map<string, string>} */
    const plannedVersions = new Map()
    for (const { name } of packages) {
      const entry = plan.get(name)
      if (!entry) throw new Error(`Changesets plan is missing ${name}`)
      plannedVersions.set(name, entry.after)
      if (expectVersion && entry.after !== expectVersion) {
        problems.push(
          `${name} would release ${entry.after}, expected ${expectVersion}`,
        )
      }
    }
    if (problems.length) {
      throw new Error(`Release plan problems:\n- ${problems.join('\n- ')}`)
    }

    await rm(outDir, { recursive: true, force: true })
    await mkdir(join(outDir, 'tarballs'), { recursive: true })
    await mkdir(join(outDir, 'npm-publish-dry-run'), { recursive: true })
    await mkdir(join(outDir, 'changelogs'), { recursive: true })

    const userconfig = join(temporary, 'empty-user-npmrc')
    const globalconfig = join(temporary, 'empty-global-npmrc')
    await writeFile(userconfig, '')
    await writeFile(globalconfig, '')
    const npmEnv = createIsolatedNpmEnv(process.env, userconfig, globalconfig)

    /** @type {Record<string, unknown>[]} */
    const results = []
    for (const { directory, name } of packages) {
      log(`\nDry-running ${name}@${plannedVersions.get(name)}`)
      const packDestination = join(temporary, 'packed', directory)
      await mkdir(packDestination, { recursive: true })
      // pnpm pack applies `files`, publishConfig overrides, and rewrites
      // `workspace:*`, so the staged tree matches what pnpm would publish.
      execPackageManagerSync(
        'pnpm',
        ['pack', '--pack-destination', packDestination],
        { cwd: join(root, 'packages', directory), stdio: 'pipe' },
      )
      const [archive] = (await readdir(packDestination)).filter((file) =>
        file.endsWith('.tgz'),
      )
      if (!archive) throw new Error(`pnpm pack produced no tarball for ${name}`)

      const stageRoot = join(temporary, 'staged', directory)
      await mkdir(stageRoot, { recursive: true })
      // bsdtar ships with Windows 10+, macOS, and Linux runners.
      execFileSync('tar', ['-xzf', archive, '-C', stageRoot], {
        cwd: packDestination,
        stdio: 'pipe',
      })
      const stagedDirectory = join(stageRoot, 'package')
      const packedManifest = JSON.parse(
        await readFile(join(stagedDirectory, 'package.json'), 'utf8'),
      )
      const stagedManifest = stagePublishManifest(
        packedManifest,
        plannedVersions,
      )
      await writeFile(
        join(stagedDirectory, 'package.json'),
        `${JSON.stringify(stagedManifest, null, 2)}\n`,
      )

      const tarballDirectory = join(outDir, 'tarballs')
      const packed = parseNpmJson(
        runGuardedNpm(
          [
            'pack',
            '--json',
            '--ignore-scripts',
            '--pack-destination',
            tarballDirectory,
          ],
          { cwd: stagedDirectory, env: npmEnv },
        ),
      )
      const published = parseNpmJson(
        runGuardedNpm(['publish', '--dry-run', '--json', '--ignore-scripts'], {
          cwd: stagedDirectory,
          env: npmEnv,
        }),
      )
      await writeFile(
        join(outDir, 'npm-publish-dry-run', `${directory}.json`),
        `${JSON.stringify(published, null, 2)}\n`,
      )
      const changelog = plan.get(name)?.changelog
      if (changelog) {
        await writeFile(
          join(outDir, 'changelogs', `${directory}.md`),
          changelog,
        )
      }

      const tarball = String(packed.filename)
      const tarballSha1 = await sha1(join(tarballDirectory, tarball))
      if (published.shasum !== tarballSha1 || packed.shasum !== tarballSha1) {
        throw new Error(
          `${name} dry-run shasum ${String(published.shasum)} does not match packed tarball ${tarballSha1}`,
        )
      }
      if (published.id !== `${name}@${plannedVersions.get(name)}`) {
        throw new Error(
          `${name} dry run reported ${String(published.id)}, expected ${name}@${plannedVersions.get(name)}`,
        )
      }

      const source = sourceManifests.get(name) ?? {}
      results.push({
        name,
        directory: `packages/${directory}`,
        sourceVersion: source.version,
        sourcePrivate: source.private,
        plannedVersion: plannedVersions.get(name),
        publishConfig: stagedManifest.publishConfig,
        dependencies: stagedManifest.dependencies ?? {},
        tarball: `tarballs/${tarball}`,
        shasum: published.shasum,
        integrity: published.integrity,
        size: published.size,
        unpackedSize: published.unpackedSize,
        entryCount: published.entryCount,
      })
      log(
        `  ${String(published.id)}  ${String(published.entryCount)} files  ${String(published.size)} B packed  sha1 ${tarballSha1}`,
      )
    }

    const summary = {
      dryRun: true,
      published: false,
      registry: DRY_RUN_REGISTRY,
      expectVersion,
      generatedAt: new Date().toISOString(),
      commit: process.env.GITHUB_SHA ?? null,
      packages: results,
    }
    await writeFile(
      join(outDir, 'summary.json'),
      `${JSON.stringify(summary, null, 2)}\n`,
    )
    await writeFile(join(outDir, 'summary.md'), renderSummary(summary))
    log(`\nEvidence written to ${relative(root, outDir) || outDir}`)
    return summary
  } finally {
    await rm(temporary, { recursive: true, force: true })
  }
}

/**
 * @param {{ packages: Record<string, unknown>[], expectVersion: string | null, commit: string | null }} summary
 */
function renderSummary(summary) {
  const rows = summary.packages.map(
    (entry) =>
      `| \`${String(entry.name)}\` | ${String(entry.sourceVersion)} → ${String(entry.plannedVersion)} | ${String(entry.entryCount)} | ${String(entry.size)} | \`${String(entry.shasum)}\` |`,
  )
  return [
    '## Release dry run (nothing published)',
    '',
    `Commit: ${summary.commit ?? 'local checkout'}. Expected version: ${summary.expectVersion ?? 'not enforced'}.`,
    '',
    '| Package | Version | Files | Packed bytes | sha1 |',
    '| --- | --- | --- | --- | --- |',
    ...rows,
    '',
    'Source manifests remain `private: true`. Publication requires separate explicit maintainer authorization.',
    '',
  ].join('\n')
}

/**
 * Re-check evidence produced by `runReleaseDryRun` (for example after it moved
 * between CI jobs): every package is present, nothing was published, and each
 * tarball still hashes to the dry-run shasum.
 *
 * @param {{
 *   evidenceDir: string
 *   packages: readonly ReleasePackage[]
 *   expectVersion?: string | null
 * }} options
 * @returns {Promise<string[]>} Problems; empty when the evidence is valid.
 */
export async function verifyReleaseEvidence(options) {
  const { evidenceDir, packages, expectVersion = null } = options
  /** @type {string[]} */
  const problems = []
  /** @type {{ dryRun?: unknown, published?: unknown, packages?: Record<string, unknown>[] }} */
  let summary
  try {
    summary = JSON.parse(
      await readFile(join(evidenceDir, 'summary.json'), 'utf8'),
    )
  } catch (error) {
    return [`Cannot read summary.json: ${String(error)}`]
  }
  if (summary.dryRun !== true) problems.push('summary.dryRun is not true')
  if (summary.published !== false)
    problems.push('summary.published is not false')
  const entries = new Map(
    (summary.packages ?? []).map((entry) => [String(entry.name), entry]),
  )
  for (const { name } of packages) {
    const entry = entries.get(name)
    if (!entry) {
      problems.push(`${name} is missing from the evidence`)
      continue
    }
    if (entry.sourcePrivate !== true) {
      problems.push(`${name} source manifest was not private`)
    }
    if (expectVersion && entry.plannedVersion !== expectVersion) {
      problems.push(
        `${name} planned ${String(entry.plannedVersion)}, expected ${expectVersion}`,
      )
    }
    const tarball = join(evidenceDir, String(entry.tarball))
    const actual = await sha1(tarball).catch(() => null)
    if (actual !== entry.shasum) {
      problems.push(
        `${name} tarball ${String(entry.tarball)} does not match sha1`,
      )
    }
  }
  return problems
}
