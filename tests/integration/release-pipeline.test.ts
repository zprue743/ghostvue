/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

import {
  DRY_RUN_REGISTRY,
  ReleaseSafetyError,
  assertSafeNpmArgs,
  createIsolatedNpmEnv,
  parseReleaseDryRunArgs,
  sourceManifestProblems,
  stagePublishManifest,
} from '../../scripts/lib/release-dry-run.js'
import { workspacePackages } from '../../scripts/workspace-packages.mjs'

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

describe('publishable package manifests', () => {
  it('stay private with public access and provenance prepared', () => {
    for (const { directory, name } of workspacePackages) {
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
      name: '@ghostvue/vue',
      version: '0.0.0',
      private: true,
      dependencies: {
        '@ghostvue/core': '0.0.0',
        '@floating-ui/dom': '1.8.0',
      },
      peerDependencies: { vue: '^3.5.0' },
    }
    const staged = stagePublishManifest(
      packed,
      new Map([
        ['@ghostvue/vue', '0.1.0'],
        ['@ghostvue/core', '0.1.0'],
      ]),
    )
    expect(staged).toEqual({
      name: '@ghostvue/vue',
      version: '0.1.0',
      dependencies: {
        '@ghostvue/core': '0.1.0',
        '@floating-ui/dom': '1.8.0',
      },
      peerDependencies: { vue: '^3.5.0' },
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
          dependencies: { '@ghostvue/playground': '0.0.0' },
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
  })
})
