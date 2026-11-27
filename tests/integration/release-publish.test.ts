/** @vitest-environment node */

import { createHash } from 'node:crypto'
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { planReleaseVersions } from '../../scripts/lib/release-dry-run.js'
import {
  alreadyPublished,
  releaseTarballs,
} from '../../scripts/publish-release.mjs'
import { publishableWorkspacePackages } from '../../scripts/workspace-packages.mjs'

const commit = 'a'.repeat(40)
const directories: string[] = []

async function evidence() {
  const directory = await mkdtemp(join(tmpdir(), 'ghostvue-release-evidence-'))
  directories.push(directory)
  await mkdir(join(directory, 'tarballs'))
  const summary = {
    commit,
    dryRun: true,
    published: false,
    expectVersion: '0.1.0',
    packages: await Promise.all(
      publishableWorkspacePackages.map(
        async ({ name, directory: packageDir }) => {
          const tarball = `tarballs/ghostvue-${packageDir}-0.1.0.tgz`
          await writeFile(join(directory, tarball), name)
          return {
            name,
            sourcePrivate: true,
            sourceVersion: '0.1.0',
            plannedVersion: '0.1.0',
            tarball,
            shasum: createHash('sha1').update(name).digest('hex'),
            integrity: `sha512-${createHash('sha512').update(name).digest('base64')}`,
          }
        },
      ),
    ),
  }
  async function save() {
    await writeFile(join(directory, 'summary.json'), JSON.stringify(summary))
  }
  await save()
  const firstPackage = summary.packages.find(
    ({ name }) => name === '@ghostvue/vue',
  )
  if (!firstPackage) throw new Error('Missing Vue release fixture')
  return { directory, summary, firstPackage, save }
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  )
})

describe('release tarballs', () => {
  it('rehearses committed versions and changelogs after Changesets are consumed', async () => {
    const root = await mkdtemp(join(tmpdir(), 'ghostvue-versioned-release-'))
    const scratch = await mkdtemp(join(tmpdir(), 'ghostvue-release-plan-'))
    directories.push(root, scratch)
    const packageDir = join(root, 'packages', 'vue')
    await mkdir(packageDir, { recursive: true })
    await mkdir(join(root, '.changeset'))
    await writeFile(join(root, 'package.json'), '{"private":true}\n')
    await writeFile(
      join(root, 'pnpm-workspace.yaml'),
      'packages:\n  - packages/*\n',
    )
    await writeFile(join(root, '.changeset', 'config.json'), '{}\n')
    await writeFile(join(root, '.changeset', 'README.md'), '# Changesets\n')
    await writeFile(
      join(packageDir, 'package.json'),
      '{"name":"@ghostvue/vue","version":"0.1.0","private":true}\n',
    )
    const changelog = '# @ghostvue/vue\n\n## 0.1.0\n\nInitial release.\n'
    await writeFile(join(packageDir, 'CHANGELOG.md'), changelog)

    const plan = await planReleaseVersions(root, scratch)
    expect(plan.get('@ghostvue/vue')).toEqual({
      directory: 'packages/vue',
      before: '0.1.0',
      after: '0.1.0',
      changelog,
    })
  })

  it('uses the verified artifact in dependency order', async () => {
    const { directory, summary, save } = await evidence()
    summary.packages.reverse()
    await save()
    const tarballs = await releaseTarballs(directory, commit)
    expect(tarballs.map(({ name }) => name)).toEqual(
      publishableWorkspacePackages.map(({ name }) => name),
    )
  })

  it('rejects stale evidence and tarballs outside the release plan', async () => {
    const { directory, firstPackage, save } = await evidence()
    await expect(releaseTarballs(directory, 'b'.repeat(40))).rejects.toThrow(
      'does not match this workflow run',
    )
    firstPackage.tarball = '../another-version.tgz'
    await save()
    await expect(releaseTarballs(directory, commit)).rejects.toThrow(
      'Invalid release plan',
    )
  })

  it('rejects conflicting tarball integrity', async () => {
    const { directory, firstPackage, save } = await evidence()
    firstPackage.integrity = 'sha512-incorrect'
    await save()
    await expect(releaseTarballs(directory, commit)).rejects.toThrow(
      'Tarball integrity does not match',
    )
  })
})

describe('publication retries', () => {
  const tarball = { name: '@ghostvue/vue', integrity: 'sha512-approved' }

  function reply(response: Response): typeof fetch {
    return () => Promise.resolve(response)
  }

  it('recognizes an absent version and an identical upload', async () => {
    await expect(
      alreadyPublished(tarball, reply(new Response(null, { status: 404 }))),
    ).resolves.toBe(false)
    await expect(
      alreadyPublished(
        tarball,
        reply(
          Response.json({
            dist: {
              integrity: tarball.integrity,
              attestations: {
                provenance: { predicateType: 'https://slsa.dev/provenance/v1' },
              },
            },
          }),
        ),
      ),
    ).resolves.toBe(true)
  })

  it('stops on a conflicting version or an unavailable registry', async () => {
    await expect(
      alreadyPublished(
        tarball,
        reply(Response.json({ dist: { integrity: 'sha512-other' } })),
      ),
    ).rejects.toThrow('different tarball integrity')
    await expect(
      alreadyPublished(
        tarball,
        reply(Response.json({ dist: { integrity: tarball.integrity } })),
      ),
    ).rejects.toThrow('missing npm provenance')
    await expect(
      alreadyPublished(tarball, reply(new Response(null, { status: 503 }))),
    ).rejects.toThrow('HTTP 503')
  })
})
