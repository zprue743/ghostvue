/** @vitest-environment node */

import { describe, expect, it } from 'vitest'

import {
  evaluatePrChangeset,
  extractLabelNames,
  formatPrChangesetFailure,
  isAddedOrModifiedChangeset,
  matchPublishablePackageInput,
  resolvePrLabels,
} from '../../scripts/lib/pr-changeset-check.js'

describe('pr-changeset-check', () => {
  describe('matchPublishablePackageInput', () => {
    it('matches publishable package runtime, type, CSS, token, and manifest inputs', () => {
      expect(
        matchPublishablePackageInput('packages/vue/src/button.ts'),
      ).toEqual({
        directory: 'vue',
        packageName: '@ghostvue/vue',
        path: 'packages/vue/src/button.ts',
      })
      expect(
        matchPublishablePackageInput('packages/themes/tokens/calm.json'),
      ).toEqual({
        directory: 'themes',
        packageName: '@ghostvue/themes',
        path: 'packages/themes/tokens/calm.json',
      })
      expect(
        matchPublishablePackageInput('packages/nuxt/src/module.ts'),
      ).toEqual({
        directory: 'nuxt',
        packageName: '@ghostvue/nuxt',
        path: 'packages/nuxt/src/module.ts',
      })
      expect(
        matchPublishablePackageInput('packages/eslint-plugin/src/index.ts'),
      ).toEqual({
        directory: 'eslint-plugin',
        packageName: '@ghostvue/eslint-plugin',
        path: 'packages/eslint-plugin/src/index.ts',
      })
      expect(
        matchPublishablePackageInput('packages/mcp/src/server.ts'),
      ).toEqual({
        directory: 'mcp',
        packageName: '@ghostvue/mcp',
        path: 'packages/mcp/src/server.ts',
      })
      expect(matchPublishablePackageInput('packages/vue/package.json')).toEqual(
        {
          directory: 'vue',
          packageName: '@ghostvue/vue',
          path: 'packages/vue/package.json',
        },
      )
    })

    it('ignores private packages (core and shared) and non-package paths', () => {
      expect(
        matchPublishablePackageInput('packages/core/src/state.ts'),
      ).toBeNull()
      expect(
        matchPublishablePackageInput('packages/shared/src/dom.ts'),
      ).toBeNull()
      expect(
        matchPublishablePackageInput('packages/core/package.json'),
      ).toBeNull()
      expect(matchPublishablePackageInput('docs/philosophy.md')).toBeNull()
      expect(
        matchPublishablePackageInput('scripts/check-pr-changeset.mjs'),
      ).toBeNull()
    })

    it('excludes test files, spec files, manifests/**, and AGENTS.md', () => {
      expect(
        matchPublishablePackageInput('packages/vue/src/button.test.ts'),
      ).toBeNull()
      expect(
        matchPublishablePackageInput('packages/vue/src/button.spec.ts'),
      ).toBeNull()
      expect(
        matchPublishablePackageInput(
          'packages/vue/manifests/ghost-button.manifest.json',
        ),
      ).toBeNull()
      expect(matchPublishablePackageInput('packages/vue/AGENTS.md')).toBeNull()
      expect(
        matchPublishablePackageInput('packages/themes/AGENTS.md'),
      ).toBeNull()
    })
  })

  describe('isAddedOrModifiedChangeset', () => {
    it('accepts added or modified .changeset/*.md entries and ignores README and deletions', () => {
      expect(
        isAddedOrModifiedChangeset({
          path: '.changeset/fix-button-focus.md',
          status: 'A',
        }),
      ).toBe(true)
      expect(
        isAddedOrModifiedChangeset({
          path: '.changeset/fix-button-focus.md',
          status: 'M',
        }),
      ).toBe(true)
      expect(
        isAddedOrModifiedChangeset({
          path: '.changeset/README.md',
          status: 'M',
        }),
      ).toBe(false)
      expect(
        isAddedOrModifiedChangeset({
          path: '.changeset/config.json',
          status: 'M',
        }),
      ).toBe(false)
      expect(
        isAddedOrModifiedChangeset({
          path: '.changeset/removed.md',
          status: 'D',
        }),
      ).toBe(false)
    })
  })

  describe('evaluatePrChangeset', () => {
    it('fails when publishable source changes lack a changeset and no-changeset label', () => {
      const result = evaluatePrChangeset({
        eventName: 'pull_request',
        files: [
          'packages/vue/src/button.ts',
          'packages/themes/tokens/calm.json',
        ],
      })

      expect(result.status).toBe('fail')
      expect(result.changedPublishableFiles).toEqual([
        'packages/vue/src/button.ts',
        'packages/themes/tokens/calm.json',
      ])
      expect(result.affectedPackages).toEqual([
        '@ghostvue/vue',
        '@ghostvue/themes',
      ])

      const message = formatPrChangesetFailure(result)
      expect(message).toContain('packages/vue/src/button.ts')
      expect(message).toContain('packages/themes/tokens/calm.json')
      expect(message).toContain('.changeset/<slug>.md')
      expect(message).toContain('no-changeset')
    })

    it('passes when at least one .changeset/*.md file is added or modified', () => {
      const result = evaluatePrChangeset({
        eventName: 'pull_request',
        files: [
          { path: 'packages/vue/src/button.ts', status: 'M' },
          { path: '.changeset/button-fix.md', status: 'A' },
        ],
      })

      expect(result.status).toBe('pass')
      expect(result.addedOrModifiedChangesets).toEqual([
        '.changeset/button-fix.md',
      ])
    })

    it('does not treat .changeset/README.md or deleted changesets as valid entries', () => {
      const result = evaluatePrChangeset({
        eventName: 'pull_request',
        files: [
          { path: 'packages/vue/src/button.ts', status: 'M' },
          { path: '.changeset/README.md', status: 'M' },
          { path: '.changeset/old-entry.md', status: 'D' },
        ],
      })

      expect(result.status).toBe('fail')
    })

    it('passes when the PR carries the no-changeset label', () => {
      const result = evaluatePrChangeset({
        eventName: 'pull_request',
        files: ['packages/vue/src/button.ts'],
        labels: ['no-changeset'],
      })

      expect(result.status).toBe('pass')
    })

    it('passes for test-only diffs in publishable packages and private package diffs', () => {
      const testOnly = evaluatePrChangeset({
        eventName: 'pull_request',
        files: [
          'packages/vue/src/button.test.ts',
          'packages/vue/manifests/ghost-button.manifest.json',
          'packages/vue/AGENTS.md',
        ],
      })
      expect(testOnly.status).toBe('pass')

      const privateOnly = evaluatePrChangeset({
        eventName: 'pull_request',
        files: ['packages/core/src/state.ts', 'packages/shared/src/dom.ts'],
      })
      expect(privateOnly.status).toBe('pass')
    })

    it('skips on push to master and schedule events', () => {
      expect(
        evaluatePrChangeset({
          eventName: 'push',
          files: ['packages/vue/src/button.ts'],
        }).status,
      ).toBe('skip')

      expect(
        evaluatePrChangeset({
          eventName: 'schedule',
          files: ['packages/vue/src/button.ts'],
        }).status,
      ).toBe('skip')
    })

    it('exempts Dependabot dependencies-labeled devDependency-only bumps', () => {
      const basePkg = JSON.stringify({
        name: '@ghostvue/vue',
        dependencies: { '@vueuse/core': '10.0.0' },
        peerDependencies: { vue: '^3.5.0' },
        devDependencies: { vitest: '4.1.11' },
      })
      const headDevOnly = JSON.stringify({
        name: '@ghostvue/vue',
        dependencies: { '@vueuse/core': '10.0.0' },
        peerDependencies: { vue: '^3.5.0' },
        devDependencies: { vitest: '4.1.12' },
      })

      const devOnlyResult = evaluatePrChangeset({
        eventName: 'pull_request',
        files: ['packages/vue/package.json', 'pnpm-lock.yaml'],
        labels: ['dependencies'],
        authorLogin: 'dependabot[bot]',
        readAtBase: () => basePkg,
        readAtHead: () => headDevOnly,
      })
      expect(devOnlyResult.status).toBe('pass')

      const headRuntimeBump = JSON.stringify({
        name: '@ghostvue/vue',
        dependencies: { '@vueuse/core': '10.1.0' },
        peerDependencies: { vue: '^3.5.0' },
        devDependencies: { vitest: '4.1.11' },
      })

      const runtimeBumpResult = evaluatePrChangeset({
        eventName: 'pull_request',
        files: ['packages/vue/package.json', 'pnpm-lock.yaml'],
        labels: ['dependencies'],
        authorLogin: 'dependabot[bot]',
        readAtBase: () => basePkg,
        readAtHead: () => headRuntimeBump,
      })
      expect(runtimeBumpResult.status).toBe('fail')
    })
  })

  describe('resolvePrLabels', () => {
    it('extracts label names from mixed string and object entries', () => {
      expect(
        extractLabelNames([
          'dependencies',
          { name: 'no-changeset' },
          null,
          { id: 1 },
        ]),
      ).toEqual(['dependencies', 'no-changeset'])
    })

    it('reads live PR labels from the GitHub API when token and PR metadata are provided', async () => {
      const requestedUrls: string[] = []
      const fetchImpl = ((input: string | URL | Request) => {
        requestedUrls.push(
          typeof input === 'string'
            ? input
            : input instanceof URL
              ? input.toString()
              : input.url,
        )
        return Promise.resolve(
          new Response(
            JSON.stringify([{ name: 'no-changeset' }, { name: 'ci' }]),
            { status: 200, headers: { 'content-type': 'application/json' } },
          ),
        )
      }) as typeof fetch

      const labels = await resolvePrLabels({
        payloadLabels: [{ name: 'stale-label' }],
        repository: 'zprue743/ghostvue',
        prNumber: 365,
        token: 'test-token',
        apiUrl: 'https://api.github.com/',
        fetchImpl,
      })

      expect(requestedUrls).toEqual([
        'https://api.github.com/repos/zprue743/ghostvue/issues/365/labels?per_page=100',
      ])
      expect(labels).toEqual(['no-changeset', 'ci'])
    })

    it('falls back to event payload labels when token is missing or API request fails', async () => {
      const noToken = await resolvePrLabels({
        payloadLabels: [{ name: 'no-changeset' }],
        repository: 'zprue743/ghostvue',
        prNumber: 365,
      })
      expect(noToken).toEqual(['no-changeset'])

      const warnings: string[] = []
      const failingFetch = (() =>
        Promise.resolve(
          new Response('Forbidden', { status: 403 }),
        )) as typeof fetch
      const failedApi = await resolvePrLabels({
        payloadLabels: [{ name: 'dependencies' }],
        repository: 'zprue743/ghostvue',
        prNumber: 365,
        token: 'test-token',
        fetchImpl: failingFetch,
        onWarning: (msg) => warnings.push(msg),
      })

      expect(failedApi).toEqual(['dependencies'])
      expect(warnings).toHaveLength(1)
      expect(warnings[0]).toContain('403')
    })
  })
})
