/** @vitest-environment node */

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

// #348: a library that pins third-party runtime dependencies exactly forces a
// second copy into consumer apps whenever their own range resolves to another
// patch, and blocks them from taking security fixes. Published runtime
// dependencies use caret ranges; the lockfile still pins what CI tests.
// See docs/standards/dependencies.md#third-party-ranges-in-published-packages-348.

const root = fileURLToPath(new URL('../..', import.meta.url))

interface Manifest {
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  peerDependenciesMeta?: Record<string, { optional?: boolean }>
}

function readManifest(directory: string): Manifest {
  return JSON.parse(
    readFileSync(`${root}/packages/${directory}/package.json`, 'utf8'),
  ) as Manifest
}

// `@ghostvue/nuxt` still pins `@nuxt/kit` and `@nuxt/schema`; relaxing those is
// tracked separately so this policy check covers vue and mcp for now.
const caretRangedPackages = ['vue', 'mcp'] as const

describe('third-party runtime ranges (#348)', () => {
  it.each(caretRangedPackages)(
    'declares caret ranges for every third-party runtime dependency of %s',
    (directory) => {
      const dependencies = Object.entries(
        readManifest(directory).dependencies ?? {},
      ).filter(([name]) => !name.startsWith('@ghostvue/'))
      expect(dependencies.length).toBeGreaterThan(0)
      for (const [name, range] of dependencies) {
        expect(range, name).toMatch(/^\^\d+\.\d+\.\d+$/)
      }
    },
  )

  it('declares unplugin-vue-components as an optional peer of @ghostvue/vue', () => {
    // The resolver matches the plugin's contract structurally and never
    // imports it; the optional peer documents the supported major without
    // installing the plugin for consumers who do not auto-import.
    const vue = readManifest('vue')
    expect(vue.dependencies).not.toHaveProperty('unplugin-vue-components')
    expect(vue.peerDependencies?.['unplugin-vue-components']).toMatch(/^\^/)
    expect(vue.peerDependenciesMeta?.['unplugin-vue-components']).toEqual({
      optional: true,
    })
  })
})
