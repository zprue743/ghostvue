import { describe, expect, it } from 'vitest'

import {
  applyExamplesHost,
  resolveExamplesHost,
} from '../../apps/playground/src/examples-host'

describe('playground examples token host', () => {
  it('defaults to the docs first paint: calm, unset density, light', () => {
    expect(resolveExamplesHost('?id=button/basic')).toEqual({
      theme: 'calm',
      density: undefined,
      mode: 'light',
    })
  })

  it('reads theme, density, and mode from the query', () => {
    expect(
      resolveExamplesHost(
        '?id=button/themed&theme=default&density=comfortable&mode=dark',
      ),
    ).toEqual({ theme: 'default', density: 'comfortable', mode: 'dark' })
  })

  it('ignores unknown values instead of writing unmatched attributes', () => {
    expect(resolveExamplesHost('?theme=neon&density=roomy&mode=sepia')).toEqual(
      { theme: 'calm', density: undefined, mode: 'light' },
    )
  })

  it('writes token attributes only and never activates recipes globally', () => {
    const root = document.createElement('html')
    root.setAttribute('data-ghost-density', 'compact')

    applyExamplesHost(root, {
      theme: 'default',
      density: 'comfortable',
      mode: 'dark',
    })
    expect(root.getAttribute('data-ghost-theme')).toBe('default')
    expect(root.getAttribute('data-ghost-density')).toBe('comfortable')
    expect(root.getAttribute('data-ghost-mode')).toBe('dark')

    // Unset density must be really unset, not left stale.
    applyExamplesHost(root, resolveExamplesHost(''))
    expect(root.hasAttribute('data-ghost-density')).toBe(false)
    expect(root.getAttribute('data-ghost-theme')).toBe('calm')
    expect(root.classList.contains('ghost-theme')).toBe(false)
  })
})
