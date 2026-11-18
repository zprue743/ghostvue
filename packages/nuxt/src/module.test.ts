/** @vitest-environment node */
import { mkdir, mkdtemp, rm } from 'node:fs/promises'
import { join, resolve } from 'node:path'

import { loadNuxt } from '@nuxt/kit'
import type * as NuxtKit from '@nuxt/kit'
import type { Component, Nuxt, NuxtConfig, NuxtImport } from '@nuxt/schema'
import { afterEach, describe, expect, it, vi } from 'vitest'

import ghostVueNuxtModule, { type GhostVueNuxtOptions } from './index'

// Observe the module's logger and simulate an app without @ghostvue/themes
// while every other @nuxt/kit utility stays real.
const kitMocks = vi.hoisted(() => ({
  warn: vi.fn(),
  themesInstalled: true,
}))
vi.mock('@nuxt/kit', async (importOriginal) => {
  const kit = await importOriginal<typeof NuxtKit>()
  return {
    ...kit,
    useLogger: (...args: Parameters<typeof kit.useLogger>) => {
      const logger = kit.useLogger(...args)
      vi.spyOn(logger, 'warn').mockImplementation((...messages: unknown[]) => {
        kitMocks.warn(...messages)
      })
      return logger
    },
    tryResolveModule: (id: string, url: URL | URL[]) =>
      kitMocks.themesInstalled
        ? kit.tryResolveModule(id, url)
        : Promise.resolve(undefined),
  }
})

const packageRoot = resolve(import.meta.dirname, '..')
const cleanup: (() => Promise<void>)[] = []

afterEach(async () => {
  while (cleanup.length > 0) await cleanup.pop()?.()
  kitMocks.warn.mockReset()
  kitMocks.themesInstalled = true
})

/** Components this module registered (Nuxt adds its own built-ins too). */
function ghostComponents(components: Component[]): Component[] {
  return components.filter(({ pascalName }) => pascalName.startsWith('Ghost'))
}

/**
 * Boots a real Nuxt instance (no build) with only this module installed. The
 * app root sits under packages/nuxt so `nuxt` and `@ghostvue/themes` resolve
 * through the package's dev dependencies.
 */
async function bootNuxt(
  options: GhostVueNuxtOptions | undefined,
): Promise<Nuxt> {
  const parent = join(packageRoot, '.cache')
  await mkdir(parent, { recursive: true })
  const rootDir = await mkdtemp(join(parent, 'nuxt-module-'))
  const overrides: NuxtConfig = {
    modules: [ghostVueNuxtModule],
    devtools: { enabled: false },
    telemetry: false,
    ...(options ? { ghostvue: options } : {}),
  }
  cleanup.push(() => rm(rootDir, { recursive: true, force: true }))
  const nuxt = await loadNuxt({ cwd: rootDir, dev: false, overrides })
  cleanup.unshift(() => nuxt.close())
  return nuxt
}

/** Runs the `components:extend` hook the way Nuxt's component scanner does. */
async function extendComponents(
  nuxt: Nuxt,
  existing: Component[] = [],
): Promise<Component[]> {
  const components = [...existing]
  await nuxt.callHook('components:extend', components)
  return components
}

describe('@ghostvue/nuxt module', () => {
  it('registers headless components and composables and injects no CSS by default', async () => {
    const nuxt = await bootNuxt(undefined)

    const components = ghostComponents(await extendComponents(nuxt))
    expect(components.length).toBeGreaterThan(100)
    const button = components.find(
      ({ pascalName }) => pascalName === 'GhostButton',
    )
    expect(button).toMatchObject({
      filePath: '@ghostvue/vue',
      export: 'GhostButton',
    })
    expect(
      components.every(({ filePath }) => filePath === '@ghostvue/vue'),
    ).toBe(true)

    const imports: NuxtImport[] = []
    await nuxt.callHook('imports:extend', imports)
    expect(imports).toContainEqual(
      expect.objectContaining({ name: 'useGhostId', from: '@ghostvue/vue' }),
    )

    expect(
      nuxt.options.css.filter((entry) => entry.includes('ghostvue')),
    ).toEqual([])
    expect(nuxt.options.build.transpile).not.toContain('@ghostvue/themes')
    expect(kitMocks.warn).not.toHaveBeenCalled()
  })

  it('resolves themed wrappers and injects opted-in CSS once', async () => {
    const nuxt = await bootNuxt({ components: 'themed', css: ['calm', 'calm'] })

    const components = ghostComponents(await extendComponents(nuxt))
    const from = new Map(
      components.map((entry) => [entry.pascalName, entry.filePath]),
    )
    expect(from.get('GhostButton')).toBe('@ghostvue/themes')
    expect(from.get('GhostVisuallyHidden')).toBe('@ghostvue/vue')
    expect(
      nuxt.options.css.filter((entry) => entry === '@ghostvue/themes/calm.css'),
    ).toHaveLength(1)
    expect(nuxt.options.build.transpile).toContain('@ghostvue/themes')
  })

  it('can turn auto-imports off entirely', async () => {
    const nuxt = await bootNuxt({ components: false, composables: false })
    expect(ghostComponents(await extendComponents(nuxt))).toEqual([])
    const imports: NuxtImport[] = []
    await nuxt.callHook('imports:extend', imports)
    expect(imports.filter(({ name }) => name.startsWith('useGhost'))).toEqual(
      [],
    )
  })

  it('warns instead of silently losing a tag to a same-named app component', async () => {
    const nuxt = await bootNuxt(undefined)
    const appButton: Component = {
      pascalName: 'GhostButton',
      kebabName: 'ghost-button',
      export: 'default',
      filePath: '/app/components/GhostButton.vue',
      shortPath: 'components/GhostButton.vue',
      chunkName: 'components/ghost-button',
      prefetch: false,
      preload: false,
      mode: 'all',
      priority: 1,
    }
    const components = await extendComponents(nuxt, [appButton])
    expect(
      components.find(({ pascalName }) => pascalName === 'GhostButton')
        ?.filePath,
    ).toBe('/app/components/GhostButton.vue')
    expect(kitMocks.warn).toHaveBeenCalledWith(
      expect.stringContaining(
        '<GhostButton> resolves to /app/components/GhostButton.vue, not @ghostvue/vue',
      ),
    )
  })

  it('fails the build with an install hint when themes are requested but missing', async () => {
    kitMocks.themesInstalled = false
    await expect(bootNuxt({ css: ['default'] })).rejects.toThrow(
      /need @ghostvue\/themes\. Install it/,
    )
  })
})
