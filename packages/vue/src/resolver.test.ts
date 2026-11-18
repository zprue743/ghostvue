import { describe, expect, it } from 'vitest'

import * as publicApi from './index'
import { GhostVueResolver } from './resolver'

/** Public `Ghost*` exports that are Vue components (SFC objects). */
function exportedComponentNames(): string[] {
  return Object.entries(publicApi)
    .filter(
      ([name, value]) =>
        /^Ghost[A-Z]/.test(name) &&
        typeof value === 'object' &&
        ('setup' in value || 'render' in value),
    )
    .map(([name]) => name)
    .sort((left, right) => left.localeCompare(right))
}

describe('GhostVueResolver', () => {
  it('is a component resolver', () => {
    expect(GhostVueResolver().type).toBe('component')
  })

  it('resolves headless components to a named import from @ghostvue/vue', () => {
    const { resolve } = GhostVueResolver()
    expect(resolve('GhostButton')).toEqual({
      name: 'GhostButton',
      from: '@ghostvue/vue',
    })
    expect(resolve('GhostDialogContent')).toEqual({
      name: 'GhostDialogContent',
      from: '@ghostvue/vue',
    })
  })

  it('leaves names it does not own to other resolvers', () => {
    const { resolve } = GhostVueResolver()
    // App components that only share the prefix must not become broken imports.
    expect(resolve('GhostFancyCard')).toBeUndefined()
    // unplugin-vue-components passes PascalCase; other spellings are not ours.
    expect(resolve('ghost-button')).toBeUndefined()
    expect(resolve('Ghostbutton')).toBeUndefined()
    // Composables and non-component values are not template components.
    expect(resolve('useGhostButton')).toBeUndefined()
    expect(resolve('CalendarDate')).toBeUndefined()
    expect(resolve('RouterLink')).toBeUndefined()
  })

  it('does not share state between resolver instances', () => {
    const first = GhostVueResolver()
    const second = GhostVueResolver()
    expect(first).not.toBe(second)
    expect(first.resolve('GhostSwitch')).toEqual(second.resolve('GhostSwitch'))
  })

  // Drift guard: the generated list must equal the components the package
  // entry really exports, so adding or removing a component in the registry
  // can never leave the resolver stale.
  it('resolves exactly the components exported by the package entry', () => {
    const { resolve } = GhostVueResolver()
    const exported = exportedComponentNames()
    expect(exported.length).toBeGreaterThan(100)
    for (const name of exported) {
      expect(resolve(name), name).toEqual({ name, from: '@ghostvue/vue' })
    }

    const resolvable = Object.keys(publicApi).filter(
      (name) => resolve(name) !== undefined,
    )
    expect(resolvable.sort((left, right) => left.localeCompare(right))).toEqual(
      exported,
    )
  })
})
