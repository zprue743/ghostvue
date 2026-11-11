/** @vitest-environment node */

import { afterEach, describe, expect, it, vi } from 'vitest'

import { startThemeTransition } from '../../packages/themes/src/start-theme-transition'

function mockWindow(options: {
  reducedMotion?: boolean
  startViewTransition?:
    ((update: () => void) => { finished: Promise<void> }) | undefined
}) {
  const document = {
    startViewTransition: options.startViewTransition,
  }
  vi.stubGlobal('document', document)
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches:
      query.includes('prefers-reduced-motion') &&
      options.reducedMotion === true,
  }))
  return document
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('startThemeTransition', () => {
  it('writes data-sl-mode immediately without View Transitions', async () => {
    mockWindow({})
    const element = { setAttribute: vi.fn() }

    await startThemeTransition(element as unknown as Element, 'dark')

    expect(element.setAttribute).toHaveBeenCalledWith('data-sl-mode', 'dark')
  })

  it('skips View Transitions when the user prefers reduced motion', async () => {
    const startViewTransition = vi.fn()
    mockWindow({ reducedMotion: true, startViewTransition })
    const element = { setAttribute: vi.fn() }

    await startThemeTransition(element as unknown as Element, 'light')

    expect(startViewTransition).not.toHaveBeenCalled()
    expect(element.setAttribute).toHaveBeenCalledWith('data-sl-mode', 'light')
  })

  it('applies the mode inside startViewTransition when available', async () => {
    const startViewTransition = vi.fn((update: () => void) => {
      update()
      return { finished: Promise.resolve() }
    })
    mockWindow({ startViewTransition })
    const element = { setAttribute: vi.fn() }

    await startThemeTransition(element as unknown as Element, 'dark')

    expect(startViewTransition).toHaveBeenCalledTimes(1)
    expect(element.setAttribute).toHaveBeenCalledWith('data-sl-mode', 'dark')
  })
})
