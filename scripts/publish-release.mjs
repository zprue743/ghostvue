import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFile, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { setTimeout } from 'node:timers/promises'
import { verifyReleaseEvidence } from './lib/release-dry-run.js'
import { publishableWorkspacePackages } from './workspace-packages.mjs'

const registry = 'https://registry.npmjs.org/'

export function distributionTag(ref, version) {
  const match = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.exec(version ?? '')
  if (!match) throw new Error('Supply an exact release version (X.Y.Z).')
  if (ref === 'refs/heads/master') return 'latest'
  if (
    ref === 'refs/heads/release/0.1.x' &&
    version.startsWith('0.1.') &&
    match[3] !== '0'
  ) {
    return 'maintenance'
  }
  throw new Error('Release version does not match the selected branch.')
}

/** Resolve and verify just the five tarballs from this workflow run. */
export async function releaseTarballs(evidenceDir, sha, version) {
  const summary = JSON.parse(
    await readFile(join(evidenceDir, 'summary.json'), 'utf8'),
  )
  if (
    !/^[a-f0-9]{40}$/.test(sha ?? '') ||
    summary.commit !== sha ||
    summary.expectVersion !== version ||
    summary.packages?.length !== publishableWorkspacePackages.length
  ) {
    throw new Error('Release evidence does not match this workflow run.')
  }

  const tarballs = publishableWorkspacePackages.map(({ directory, name }) => {
    const entry = summary.packages.find((pkg) => pkg.name === name)
    const path = `tarballs/ghostvue-${directory}-${version}.tgz`
    if (entry?.tarball !== path || entry.sourceVersion !== version) {
      throw new Error(`Invalid release plan for ${name}@${version}.`)
    }
    return {
      name,
      path: resolve(evidenceDir, path),
      integrity: entry.integrity,
    }
  })

  const problems = await verifyReleaseEvidence({
    evidenceDir,
    packages: publishableWorkspacePackages,
    expectVersion: version,
  })
  if (problems.length) throw new Error(problems.join('\n'))

  for (const { name, path, integrity } of tarballs) {
    const digest = createHash('sha512')
      .update(await readFile(path))
      .digest('base64')
    if (integrity !== `sha512-${digest}`) {
      throw new Error(
        `Tarball integrity does not match for ${name}@${version}.`,
      )
    }
  }
  return tarballs
}

/** A retry may skip a package only if the registry already has these bytes. */
export async function alreadyPublished(
  { name, integrity },
  version,
  request = fetch,
) {
  const id = `${name}@${version}`
  const response = await request(
    `${registry}${encodeURIComponent(name)}/${version}`,
    {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(15000),
    },
  )
  if (response.status === 404) return false
  if (!response.ok)
    throw new Error(`Registry lookup for ${id}: HTTP ${response.status}.`)
  const { dist } = await response.json()
  if (dist?.integrity !== integrity) {
    throw new Error(`${id} already exists with different tarball integrity.`)
  }
  if (!dist.attestations?.provenance?.predicateType) {
    throw new Error(`${id} is missing npm provenance.`)
  }
  return true
}

function npm(args, cwd) {
  execFileSync('npm', [...args, '--registry', registry], {
    cwd,
    stdio: 'inherit',
  })
}

async function publish(evidenceDir, version) {
  if (
    process.env.GITHUB_ACTIONS !== 'true' ||
    process.env.GITHUB_WORKFLOW !== 'Publish npm release' ||
    process.env.GITHUB_REPOSITORY !== 'zprue743/ghostvue' ||
    process.env.GITHUB_EVENT_NAME !== 'workflow_dispatch'
  ) {
    throw new Error('Use the manual Publish npm release workflow.')
  }
  const tag = distributionTag(process.env.GITHUB_REF, version)
  const tarballs = await releaseTarballs(
    evidenceDir,
    process.env.GITHUB_SHA,
    version,
  )
  // Check for conflicts across the entire train before publishing any package.
  const present = await Promise.all(
    tarballs.map((tarball) => alreadyPublished(tarball, version)),
  )
  for (const [index, { name, path }] of tarballs.entries()) {
    if (present[index]) {
      console.log(`${name}@${version} already matches the verified tarball.`)
      continue
    }
    npm([
      'publish',
      path,
      '--access',
      'public',
      '--tag',
      tag,
      '--provenance',
      '--ignore-scripts',
    ])
  }
}

async function installable(tarball, version) {
  if (!(await alreadyPublished(tarball, version))) return false
  // Exact-version metadata can appear before the npm install index.
  const response = await fetch(
    `${registry}${tarball.name.replace('/', '%2f')}`,
    {
      headers: {
        accept: 'application/vnd.npm.install-v1+json',
        'cache-control': 'no-cache',
      },
      signal: AbortSignal.timeout(15000),
    },
  )
  if (response.status === 404) return false
  if (!response.ok) {
    throw new Error(
      `npm install index for ${tarball.name}: HTTP ${response.status}.`,
    )
  }
  const index = await response.json()
  return index.versions?.[version]?.dist?.integrity === tarball.integrity
}

async function verifyPublicInstall(evidenceDir, version) {
  distributionTag(process.env.GITHUB_REF, version)
  const tarballs = await releaseTarballs(
    evidenceDir,
    process.env.GITHUB_SHA,
    version,
  )
  const deadline = Date.now() + 15 * 60 * 1000
  for (;;) {
    const checks = await Promise.all(
      tarballs.map((tarball) => installable(tarball, version)),
    )
    const pending = tarballs
      .filter((_, index) => !checks[index])
      .map(({ name }) => name)
    if (pending.length === 0) break
    const message = `Waiting for npm to index ${version} for ${pending.join(', ')}.`
    if (Date.now() >= deadline) {
      throw new Error(`${message} Retry only the verification job.`)
    }
    console.log(message)
    await setTimeout(30000)
  }
  const prefix = await mkdtemp(join(tmpdir(), 'ghostvue-public-release-'))
  const specs = publishableWorkspacePackages.map(
    ({ name }) => `${name}@${version}`,
  )
  try {
    await writeFile(
      join(prefix, 'package.json'),
      '{"name":"ghostvue-public-release-check","version":"0.0.0","private":true}\n',
    )
    npm(
      ['install', '--save-exact', '--ignore-scripts', '--no-audit', ...specs],
      prefix,
    )
    npm(['audit', 'signatures'], prefix)
    const links = publishableWorkspacePackages.map(
      ({ name }) =>
        `- [${name}@${version}](https://www.npmjs.com/package/${name}/v/${version})`,
    )
    const summary = ['## Verified public install', '', ...links, ''].join('\n')
    if (process.env.GITHUB_STEP_SUMMARY)
      await appendFile(process.env.GITHUB_STEP_SUMMARY, summary)
    else console.log(summary)
  } finally {
    await rm(prefix, { recursive: true, force: true })
  }
}

if (import.meta.main) {
  const [argument, evidenceDir, ...extra] = process.argv.slice(2)
  try {
    if (
      argument === '--verify-public-install' &&
      evidenceDir &&
      !extra.length
    ) {
      await verifyPublicInstall(evidenceDir, process.env.EXPECTED_VERSION)
    } else if (
      argument &&
      argument !== '--verify-public-install' &&
      !evidenceDir
    ) {
      await publish(argument, process.env.EXPECTED_VERSION)
    } else {
      throw new Error(
        'Supply an evidence directory, optionally with --verify-public-install.',
      )
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  }
}
