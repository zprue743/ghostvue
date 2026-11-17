/** @vitest-environment node */

import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { build, loadConfigFromFile } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import {
  bundleFixture,
  findExternalViolations,
  readComponentNames,
} from '../../scripts/lib/bundle-size.js'

const repositoryRoot = fileURLToPath(new URL('../..', import.meta.url))
const vuePackageDir = resolve(repositoryRoot, 'packages/vue')
const themesEntry = resolve(repositoryRoot, 'packages/themes/src/index.ts')

/**
 * Component identity strings that survive minification: Vue SFCs compile to
 * `__name:"GhostX"` and themed wrappers declare `name:"GhostX"` (the minifier
 * may print either as a template literal). Finding one in a bundle means that
 * component's definition was shipped.
 */
function containsStringLiteral(code: string, value: string): boolean {
  return [`"${value}"`, `'${value}'`, `\`${value}\``].some((literal) =>
    code.includes(literal),
  )
}

function componentMarkers(code: string): Set<string> {
  return new Set(
    [
      ...code.matchAll(/(?:__name|\bname)\s*:\s*["'`](Ghost[A-Za-z]+)["'`]/g),
    ].map((match) => match[1] ?? ''),
  )
}

describe('single-component imports tree-shake against built packages', () => {
  let outDir = ''
  let builtVueEntry = ''
  let vueComponents: string[] = []
  let themesComponents: string[] = []

  beforeAll(async () => {
    // Build @ghostvue/vue with its real library config (single-file ESM with
    // externals) so the fixtures exercise the shipped artifact, not source.
    const loaded = await loadConfigFromFile(
      { command: 'build', mode: 'production' },
      resolve(vuePackageDir, 'vite.config.ts'),
      vuePackageDir,
    )
    if (!loaded) throw new Error('Expected packages/vue/vite.config.ts to load')

    const cacheDir = resolve(vuePackageDir, '.cache')
    await mkdir(cacheDir, { recursive: true })
    outDir = await mkdtemp(join(cacheDir, 'bundle-tree-shaking-'))
    await build({
      ...loaded.config,
      configFile: false,
      root: vuePackageDir,
      logLevel: 'silent',
      build: { ...loaded.config.build, outDir, emptyOutDir: true },
    })
    builtVueEntry = join(outDir, 'ghostvue.js')

    vueComponents = await readComponentNames(repositoryRoot, {
      directory: 'vue',
    })
    themesComponents = await readComponentNames(repositoryRoot, {
      directory: 'themes',
    })
  }, 120_000)

  afterAll(async () => {
    if (outDir) await rm(outDir, { recursive: true, force: true })
  })

  it.each(['GhostButton', 'GhostBadge', 'GhostSwitch', 'GhostSeparator'])(
    'importing { %s } from @ghostvue/vue ships no other component and keeps vue external',
    async (component) => {
      const result = await bundleFixture({
        source: `export { ${component} } from '@ghostvue/vue'\n`,
        aliases: { '@ghostvue/vue': builtVueEntry },
      })

      expect(result.exports).toEqual([component])
      expect(findExternalViolations(result)).toEqual([])
      expect(result.externalImports).toEqual(['vue'])
      expect([...componentMarkers(result.js)]).toEqual([component])

      // Guard the marker scan itself: every other documented component must
      // be absent, including ones the whole-package bundle does contain.
      for (const other of vueComponents) {
        if (other === component) continue
        expect(containsStringLiteral(result.js, other), other).toBe(false)
      }
      // Leaf controls never need positioning or date math.
      expect(
        result.bundledModules.filter((id) =>
          /@floating-ui|@internationalized/.test(id),
        ),
      ).toEqual([])
    },
    60_000,
  )

  it('drops the shared visually hidden style from imports that never use it', async () => {
    const button = await bundleFixture({
      source: `export { GhostButton } from '@ghostvue/vue'\n`,
      aliases: { '@ghostvue/vue': builtVueEntry },
    })
    expect(button.js).not.toContain('inset(50%)')

    const hidden = await bundleFixture({
      source: `export { GhostVisuallyHidden } from '@ghostvue/vue'\n`,
      aliases: { '@ghostvue/vue': builtVueEntry },
    })
    expect(hidden.js).toContain('inset(50%)')
  }, 60_000)

  it('the whole-package fixture really contains the markers the leaf checks rely on', async () => {
    const result = await bundleFixture({
      source: `export * from '@ghostvue/vue'\n`,
      aliases: { '@ghostvue/vue': builtVueEntry },
    })
    const markers = componentMarkers(result.js)
    expect(findExternalViolations(result)).toEqual([])
    for (const name of ['GhostButton', 'GhostCalendar', 'GhostCombobox']) {
      expect(markers.has(name)).toBe(true)
    }
    expect(result.externalImports).toEqual(['vue'])
  }, 60_000)

  it('importing { GhostButton } from @ghostvue/themes ships only the themed and headless button', async () => {
    const result = await bundleFixture({
      source: `export { GhostButton } from '@ghostvue/themes'\n`,
      aliases: {
        '@ghostvue/themes': themesEntry,
        '@ghostvue/vue': builtVueEntry,
      },
    })

    expect(findExternalViolations(result)).toEqual([])
    expect(result.externalImports).toEqual(['vue'])
    expect([...componentMarkers(result.js)]).toEqual(['GhostButton'])
    for (const other of themesComponents) {
      if (other === 'GhostButton') continue
      expect(containsStringLiteral(result.js, other), other).toBe(false)
    }
    // Token tables and the culori-based theme compiler stay out of a
    // component import.
    expect(
      result.bundledModules.filter((id) =>
        /generated[\\/]tokens|culori|define/.test(id),
      ),
    ).toEqual([])
  }, 60_000)
})
