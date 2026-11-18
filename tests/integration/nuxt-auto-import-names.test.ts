/** @vitest-environment node */
/**
 * Drift guards for the generated `@ghostvue/nuxt` auto-import lists: they must
 * equal what the real `@ghostvue/vue` and `@ghostvue/themes` entries export,
 * so adding, renaming, or removing a component in the registry can never leave
 * the Nuxt module registering a stale or missing tag.
 */
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { describe, expect, it } from 'vitest'

import {
  ghostVueNuxtStylesheets,
  planGhostVueNuxt,
} from '../../packages/nuxt/src/plan'
import * as themedApi from '../../packages/themes/src/index'
import * as headlessApi from '../../packages/vue/src/index'

function sorted(names: Iterable<string>): string[] {
  return [...names].sort((left, right) => left.localeCompare(right))
}

/** `Ghost*` exports that are Vue components (SFC or defineComponent objects). */
function componentExports(api: Record<string, unknown>): string[] {
  return sorted(
    Object.entries(api)
      .filter(
        ([name, value]) =>
          /^Ghost[A-Z]/.test(name) &&
          typeof value === 'object' &&
          value !== null &&
          ('setup' in value || 'render' in value),
      )
      .map(([name]) => name),
  )
}

describe('generated auto-import names', () => {
  it('match the headless components exported by @ghostvue/vue', () => {
    expect(
      sorted(planGhostVueNuxt().components.map(({ name }) => name)),
    ).toEqual(componentExports(headlessApi))
  })

  it('match the themed components exported by @ghostvue/themes', () => {
    const themed = planGhostVueNuxt({ components: 'themed' })
      .components.filter(({ from }) => from === '@ghostvue/themes')
      .map(({ name }) => name)
    expect(sorted(themed)).toEqual(componentExports(themedApi))
  })

  it('match the useGhost* functions exported by @ghostvue/vue', () => {
    const exported = sorted(
      Object.entries(headlessApi)
        .filter(
          ([name, value]) =>
            /^useGhost[A-Z]/.test(name) && typeof value === 'function',
        )
        .map(([name]) => name),
    )
    expect(
      sorted(planGhostVueNuxt().composables.map(({ name }) => name)),
    ).toEqual(exported)
  })

  it('accept exactly the theme stylesheets @ghostvue/themes exports', () => {
    const manifest = JSON.parse(
      readFileSync(
        resolve(process.cwd(), 'packages/themes/package.json'),
        'utf8',
      ),
    ) as { exports: Record<string, unknown> }
    const cssExports = Object.keys(manifest.exports)
      .map((subpath) => /^\.\/(.+)\.css$/.exec(subpath)?.[1])
      .filter((name): name is string => name !== undefined)
    expect(sorted(ghostVueNuxtStylesheets)).toEqual(sorted(cssExports))
  })
})
