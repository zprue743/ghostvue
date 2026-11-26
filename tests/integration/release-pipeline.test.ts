/** @vitest-environment node */

import { readFileSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  DRY_RUN_REGISTRY,
  ReleaseSafetyError,
  assertSafeNpmArgs,
  createIsolatedNpmEnv,
  internalRangeProblems,
  parseReleaseDryRunArgs,
  sourceManifestProblems,
  stagePublishManifest,
} from '../../scripts/lib/release-dry-run.js'
import {
  publishableWorkspacePackages,
  workspacePackages,
} from '../../scripts/workspace-packages.mjs'

// GHO-57: the maintainer authorized a dry-run pipeline and approval gate only.
// These tests pin the invariants that keep real publication impossible until a
// separate, explicit authorization changes them on purpose.

const root = fileURLToPath(new URL('../..', import.meta.url))
const workflowPath = '.github/workflows/release-dry-run.yml'

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(`${root}/${path}`, 'utf8')) as Record<
    string,
    unknown
  >
}

/** Workflow source with full-line comments removed so prose cannot mask code. */
function workflowCode(): string {
  return readFileSync(`${root}/${workflowPath}`, 'utf8')
    .split('\n')
    .filter((line) => !/^\s*#/.test(line))
    .join('\n')
}

/** Split the `jobs:` mapping into job id -> job body text. */
function workflowJobs(): Map<string, string> {
  const code = workflowCode()
  const jobsSection = code.slice(code.indexOf('\njobs:\n') + '\njobs:\n'.length)
  const jobs = new Map<string, string>()
  let current: string | null = null
  for (const line of jobsSection.split('\n')) {
    const header = /^ {2}([\w-]+):\s*$/.exec(line)
    if (header) {
      current = header[1]
      jobs.set(current, '')
      continue
    }
    if (current) jobs.set(current, `${jobs.get(current) ?? ''}${line}\n`)
  }
  return jobs
}

describe('release workflow', () => {
  it('only runs on manual dispatch', () => {
    const code = workflowCode()
    const triggers = code.slice(
      code.indexOf('\non:\n'),
      code.indexOf('\nconcurrency:'),
    )
    expect(triggers).toContain('workflow_dispatch:')
    expect(triggers).not.toMatch(
      /^\s{2}(push|pull_request|pull_request_target|release|schedule|workflow_run):/m,
    )
  })

  it('defaults to no permissions and never grants write access to contents or packages', () => {
    const code = workflowCode()
    expect(code).toMatch(/^permissions: \{\}$/m)
    expect(code).not.toMatch(
      /\b(contents|packages|actions|deployments): write\b/,
    )
    expect(code).not.toMatch(/write-all/)
  })

  it('gates maintainer approval behind the npm-release environment', () => {
    const jobs = workflowJobs()
    const gated = jobs.get('maintainer-approval') ?? ''
    expect(gated).toMatch(/^ {4}environment: npm-release$/m)
    expect(gated).toMatch(/^ {6}contents: read$/m)
    expect(gated).toMatch(/needs: dry-run/)
    expect(gated).toMatch(/if: github\.ref == 'refs\/heads\/master'/)
    expect(jobs.get('dry-run')).not.toMatch(/environment:/)
  })

  it('grants id-token: write to no job until publication is authorized', () => {
    // The future authorized publish PR adds it to maintainer-approval only.
    const raw = readFileSync(`${root}/${workflowPath}`, 'utf8')
    expect(raw).not.toMatch(/id-token\s*:/)
    expect(raw).not.toMatch(/ACTIONS_ID_TOKEN_REQUEST/)
  })

  it('contains no executable publication path or registry credentials', () => {
    const code = workflowCode()
    expect(code).not.toMatch(/\b(npm|pnpm|yarn)\s+publish\b/)
    expect(code).not.toMatch(/changeset\s+publish/)
    expect(code).not.toMatch(/changesets\/action/)
    expect(code).not.toMatch(
      /NPM_TOKEN|NODE_AUTH_TOKEN|_authToken|registry-url/,
    )
    expect(code).not.toMatch(/secrets\./)
    for (const line of code
      .split('\n')
      .filter((l) => l.includes('release-dry-run') && l.includes('run:'))) {
      expect(line).toMatch(/--dry-run|release:dry-run/)
    }
  })

  it('reuses the existing packed-export gates and uploads evidence', () => {
    const dryRun = workflowJobs().get('dry-run') ?? ''
    expect(dryRun).toMatch(/run: pnpm published-exports/)
    expect(dryRun).toMatch(/run: pnpm exports:check/)
    expect(dryRun).toMatch(/run: pnpm release:dry-run/)
    expect(dryRun).toMatch(/name: release-dry-run-evidence/)
    expect(dryRun).toMatch(/run: git diff --exit-code/)
  })

  it('gates the packed MCP server before the dry run (GHO-232)', () => {
    const dryRun = workflowJobs().get('dry-run') ?? ''
    const packed = dryRun.indexOf('run: pnpm mcp:packed')
    expect(packed).toBeGreaterThan(dryRun.indexOf('run: pnpm build'))
    expect(packed).toBeLessThan(dryRun.indexOf('run: pnpm release:dry-run'))
  })

  it('runs the packed consumer smoke before the dry run (GHO-217)', () => {
    const dryRun = workflowJobs().get('dry-run') ?? ''
    const consumers = dryRun.indexOf('run: pnpm consumer:packed')
    expect(consumers).toBeGreaterThan(dryRun.indexOf('run: pnpm build'))
    expect(consumers).toBeLessThan(dryRun.indexOf('run: pnpm release:dry-run'))
  })

  it('pins every action to the same commit SHA and release as CI', () => {
    // tests/integration/ci-workflow-policy.test.ts enforces SHA pins across
    // all workflows; this ties the release workflow to CI's exact pins.
    const pinsIn = (path: string) =>
      [
        ...readFileSync(`${root}/${path}`, 'utf8').matchAll(
          /^\s*(?:- )?uses: ([^@\s]+)@(\S+)(?: # (\S+))?$/gm,
        ),
      ].map(([, action = '', ref = '', version = '']) => ({
        action,
        ref,
        version,
      }))
    const ciPins = new Map(
      pinsIn('.github/workflows/ci.yml').map(({ action, ref, version }) => [
        action,
        `${ref} # ${version}`,
      ]),
    )
    const releasePins = pinsIn(workflowPath)
    expect(releasePins.length).toBeGreaterThan(0)
    for (const { action, ref, version } of releasePins) {
      expect(ref, action).toMatch(/^[0-9a-f]{40}$/)
      expect(`${ref} # ${version}`, action).toBe(ciPins.get(action))
    }
  })
})

/** Pending Changeset bump types keyed by package name. */
function pendingChangesetBumps(): Map<string, Set<string>> {
  const bumps = new Map<string, Set<string>>()
  for (const file of readdirSync(`${root}/.changeset`)) {
    if (!file.endsWith('.md') || file === 'README.md') continue
    const source = readFileSync(`${root}/.changeset/${file}`, 'utf8')
    const frontmatter = /^---\n([\s\S]*?)\n---/.exec(source)?.[1] ?? ''
    for (const [, name = '', bump = ''] of frontmatter.matchAll(
      /^['"]?(@ghostvue\/[\w-]+)['"]?:\s*(\w+)\s*$/gm,
    )) {
      bumps.set(name, (bumps.get(name) ?? new Set()).add(bump))
    }
  }
  return bumps
}

describe('release train', () => {
  it('is the five 0.1.0 packages; core and shared stay internal (GHO-217)', () => {
    expect(publishableWorkspacePackages.map(({ name }) => name)).toEqual([
      '@ghostvue/vue',
      '@ghostvue/themes',
      '@ghostvue/nuxt',
      '@ghostvue/eslint-plugin',
      '@ghostvue/mcp',
    ])
    expect(
      workspacePackages
        .filter(({ publishable }) => !publishable)
        .map(({ name }) => name),
    ).toEqual(['@ghostvue/shared', '@ghostvue/core'])
  })

  it('keeps internal packages private, unprepared for npm, and out of every published dependency group', () => {
    const internal = workspacePackages.filter(({ publishable }) => !publishable)
    for (const { directory, name } of internal) {
      const manifest = readJson(`packages/${directory}/package.json`)
      expect(manifest.name).toBe(name)
      expect(manifest.private, name).toBe(true)
      expect(manifest.publishConfig, name).toBeUndefined()
    }
    // A published package that names an internal one would install a package
    // that does not exist on npm.
    const internalNames = new Set(internal.map(({ name }) => name))
    for (const { directory, name } of publishableWorkspacePackages) {
      const manifest = readJson(`packages/${directory}/package.json`)
      for (const field of [
        'dependencies',
        'peerDependencies',
        'optionalDependencies',
      ]) {
        const names = Object.keys(
          (manifest[field] as Record<string, string> | undefined) ?? {},
        )
        expect(
          names.filter((dependency) => internalNames.has(dependency)),
          `${name} ${field}`,
        ).toEqual([])
      }
    }
  })
})

describe('publishable package manifests', () => {
  it('stay private with public access and provenance prepared', () => {
    for (const { directory, name } of publishableWorkspacePackages) {
      const manifest = readJson(`packages/${directory}/package.json`)
      expect(manifest.name).toBe(name)
      expect(manifest.private).toBe(true)
      expect(manifest.publishConfig).toEqual({
        access: 'public',
        provenance: true,
      })
      expect(sourceManifestProblems(manifest, `packages/${directory}`)).toEqual(
        [],
      )
    }
  })

  it('range every internal dependency and peer with workspace:^ so packing yields ^x.y.z (#345)', () => {
    // An exact pin nests a second @ghostvue/vue under themes (split state) or
    // fails npm installs with ERESOLVE when a consumer's versions differ.
    for (const { directory } of publishableWorkspacePackages) {
      expect(
        internalRangeProblems(readJson(`packages/${directory}/package.json`)),
      ).toEqual([])
    }
    const themes = readJson('packages/themes/package.json')
    expect(themes.dependencies).toBeUndefined()
    expect(themes.peerDependencies).toMatchObject({
      '@ghostvue/vue': 'workspace:^',
    })
    // Peers are not installed in the workspace; the build still needs vue.
    expect(themes.devDependencies).toMatchObject({
      '@ghostvue/vue': 'workspace:*',
    })
  })

  it('flag exact or workspace:* internal ranges in published dependency groups', () => {
    expect(
      internalRangeProblems({
        name: '@ghostvue/nuxt',
        dependencies: { '@ghostvue/vue': 'workspace:*', culori: '4.0.2' },
        peerDependencies: { '@ghostvue/themes': '0.1.0', vue: '^3.5.0' },
        optionalDependencies: { '@ghostvue/mcp': 'workspace:~' },
        devDependencies: { '@ghostvue/vue': 'workspace:*' },
      }),
    ).toEqual([
      expect.stringContaining(
        'dependencies must use "workspace:^" for @ghostvue/vue, not "workspace:*"',
      ),
      expect.stringContaining(
        'peerDependencies must use "workspace:^" for @ghostvue/themes, not "0.1.0"',
      ),
      expect.stringContaining(
        'optionalDependencies must use "workspace:^" for @ghostvue/mcp, not "workspace:~"',
      ),
    ])
  })

  it('version the five publishable packages in lockstep (#345)', () => {
    // A `fixed` group gives every member the highest pending bump, so a minor
    // change to one package moves all five and caret ranges keep matching.
    const config = readJson('.changeset/config.json')
    expect(config.fixed).toEqual([
      publishableWorkspacePackages.map(({ name }) => name),
    ])
    expect(config.linked).toEqual([])
  })

  it('include the MCP server on the release train (GHO-17 M6)', () => {
    // Zac approved M6 on Nov 22, 2026: @ghostvue/mcp releases 0.1.0 with the
    // other packages and stays private until GHO-57 authorizes publishing.
    const mcp = workspacePackages.find(({ name }) => name === '@ghostvue/mcp')
    expect(mcp?.directory).toBe('mcp')
    const manifest = readJson('packages/mcp/package.json')
    expect(manifest.private).toBe(true)
    expect(manifest.version).toBe('0.0.0')
    expect(manifest.files).toEqual(['dist'])
    expect(manifest.bin).toEqual({ 'ghostvue-mcp': './dist/bin.js' })
  })

  it('each have a pending minor Changeset for the first 0.1.0 release', () => {
    // `pnpm release:dry-run --expect-version 0.1.0` fails for any package
    // that Changesets would leave at 0.0.0.
    const bumps = pendingChangesetBumps()
    for (const { name } of publishableWorkspacePackages) {
      const planned = [...(bumps.get(name) ?? [])]
      expect(planned, name).toContain('minor')
      expect(planned, name).not.toContain('major')
    }
  })

  it('pend no Changeset for internal packages, which never release', () => {
    const bumps = pendingChangesetBumps()
    for (const { name, publishable } of workspacePackages) {
      if (publishable) continue
      expect(bumps.has(name), name).toBe(false)
    }
  })

  it('keep the root script on the dry-run path', () => {
    const scripts = readJson('package.json').scripts as Record<string, string>
    expect(scripts['release:dry-run']).toBe(
      'node scripts/release-dry-run.mjs --dry-run',
    )
    for (const [name, command] of Object.entries(scripts)) {
      expect(`${name}: ${command}`).not.toMatch(
        /\b(npm|pnpm)\s+publish\b|changeset\s+publish/,
      )
    }
  })

  it('flag manifests that would be publishable or lack provenance metadata', () => {
    expect(
      sourceManifestProblems(
        { name: '@ghostvue/core', private: false },
        'packages/core',
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.stringContaining('must stay "private": true'),
        expect.stringContaining('publishConfig.access'),
        expect.stringContaining('publishConfig.provenance'),
        expect.stringContaining('repository.url'),
      ]),
    )
  })
})

describe('release dry-run guards', () => {
  it('requires an explicit --dry-run', () => {
    expect(() => parseReleaseDryRunArgs([])).toThrow(ReleaseSafetyError)
    expect(() => parseReleaseDryRunArgs(['--expect-version', '0.1.0'])).toThrow(
      /REFUSING TO PUBLISH/,
    )
    expect(parseReleaseDryRunArgs(['--dry-run'])).toMatchObject({
      expectVersion: null,
      verifyEvidence: null,
    })
  })

  it('refuses arguments that request a real publication', () => {
    for (const flag of [
      '--publish',
      '--no-dry-run',
      '--dry-run=false',
      '--otp=123456',
    ]) {
      expect(() => parseReleaseDryRunArgs(['--dry-run', flag])).toThrow(
        ReleaseSafetyError,
      )
    }
  })

  it('only allows npm pack and npm publish --dry-run', () => {
    expect(() => {
      assertSafeNpmArgs(['pack', '--json'])
    }).not.toThrow()
    expect(() => {
      assertSafeNpmArgs(['publish', '--dry-run', '--json'])
    }).not.toThrow()
    expect(() => {
      assertSafeNpmArgs(['publish', '--json'])
    }).toThrow(ReleaseSafetyError)
    expect(() => {
      assertSafeNpmArgs(['publish', '--dry-run', '--no-dry-run'])
    }).toThrow(ReleaseSafetyError)
    expect(() => {
      assertSafeNpmArgs(['dist-tag', 'add', '@ghostvue/vue@0.1.0', 'latest'])
    }).toThrow(ReleaseSafetyError)
  })

  it('strips credentials, OIDC request variables, and npm config from child npm', () => {
    const env = createIsolatedNpmEnv(
      {
        PATH: '/usr/bin',
        NODE_AUTH_TOKEN: 'secret',
        NPM_TOKEN: 'secret',
        'npm_config_//registry.npmjs.org/:_authToken': 'secret',
        npm_config_registry: 'https://registry.npmjs.org/',
        npm_config_userconfig: '/home/me/.npmrc',
        ACTIONS_ID_TOKEN_REQUEST_URL: 'https://token.example',
        ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'secret',
      },
      '/tmp/user-npmrc',
      '/tmp/global-npmrc',
    )
    expect(env).toEqual({
      PATH: '/usr/bin',
      npm_config_userconfig: '/tmp/user-npmrc',
      npm_config_globalconfig: '/tmp/global-npmrc',
      npm_config_registry: DRY_RUN_REGISTRY,
      npm_config_dry_run: 'true',
      npm_config_audit: 'false',
      npm_config_fund: 'false',
      npm_config_update_notifier: 'false',
    })
    expect(new URL(DRY_RUN_REGISTRY).hostname.endsWith('.invalid')).toBe(true)
  })

  it('stages a planned manifest without mutating the packed one', () => {
    const packed = {
      name: '@ghostvue/themes',
      version: '0.0.0',
      private: true,
      dependencies: { culori: '4.0.2' },
      peerDependencies: { '@ghostvue/vue': '^0.0.0', vue: '^3.5.0' },
    }
    const staged = stagePublishManifest(
      packed,
      new Map([
        ['@ghostvue/vue', '0.1.0'],
        ['@ghostvue/themes', '0.1.0'],
      ]),
    )
    expect(staged).toEqual({
      name: '@ghostvue/themes',
      version: '0.1.0',
      dependencies: { culori: '4.0.2' },
      peerDependencies: { '@ghostvue/vue': '^0.1.0', vue: '^3.5.0' },
    })
    expect(packed.private).toBe(true)
    expect(packed.version).toBe('0.0.0')
  })

  it('rejects internal dependencies outside the release and unresolved workspace ranges', () => {
    const versions = new Map([['@ghostvue/themes', '0.1.0']])
    expect(() =>
      stagePublishManifest(
        {
          name: '@ghostvue/themes',
          dependencies: { '@ghostvue/core': '0.0.0' },
        },
        versions,
      ),
    ).toThrow(/not part of the release/)
    expect(() =>
      stagePublishManifest(
        {
          name: '@ghostvue/themes',
          dependencies: { '@ghostvue/vue': 'workspace:*' },
        },
        versions,
      ),
    ).toThrow(/unresolved/)
    // `workspace:*` packs to an exact version; staging refuses to publish it.
    expect(() =>
      stagePublishManifest(
        {
          name: '@ghostvue/nuxt',
          peerDependencies: { '@ghostvue/themes': '0.0.0' },
        },
        new Map([
          ['@ghostvue/nuxt', '0.1.0'],
          ['@ghostvue/themes', '0.1.0'],
        ]),
      ),
    ).toThrow(/must pack to a caret range/)
  })
})
