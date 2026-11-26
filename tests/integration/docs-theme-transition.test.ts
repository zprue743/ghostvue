import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  runDocsViewTransition,
  switchDocsTheme,
} from '../../apps/docs/.vitepress/theme/docs-theme-transition'
import { DOCS_THEME_STORAGE_KEY } from '../../apps/docs/.vitepress/theme/restore-theme'

/*
 * Docs theme switches crossfade through the View Transitions API. jsdom has
 * neither that API nor `matchMedia`, so each test installs the pieces it
 * needs and the default (nothing installed) is the "unsupported browser"
 * path.
 */

type Update = () => void | Promise<void>

interface TransitionDocument {
  startViewTransition?: (update: Update) => {
    ready: Promise<void>
    finished: Promise<void>
  }
}

const viewDocument = document as unknown as TransitionDocument

function stubReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches })),
  )
}

/**
 * A `startViewTransition` that holds each update until the test releases it,
 * like the browser, which runs the update on a later frame.
 */
function installDeferredTransitions(): { updates: Update[] } {
  const updates: Update[] = []
  viewDocument.startViewTransition = (update) => {
    updates.push(update)
    return { ready: Promise.resolve(), finished: Promise.resolve() }
  }
  return { updates }
}

/*
 * An in-memory `localStorage`. The Node runtime ships its own experimental
 * global of that name, which shadows jsdom's and has no working methods
 * unless Node is started with a storage file.
 */
function stubStorage(setItem?: (key: string, value: string) => void): {
  stored: Map<string, string>
} {
  const stored = new Map<string, string>()
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => stored.get(key) ?? null,
    setItem:
      setItem ??
      ((key: string, value: string) => {
        stored.set(key, value)
      }),
  })
  return { stored }
}

function theme(): string | null {
  return document.documentElement.getAttribute('data-ghost-theme')
}

describe('docs theme transition', () => {
  beforeEach(() => {
    document.documentElement.setAttribute('data-ghost-theme', 'calm')
    stubStorage()
  })

  afterEach(() => {
    delete viewDocument.startViewTransition
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('switches at once and persists when view transitions are missing', () => {
    switchDocsTheme('vibrant')
    expect(theme()).toBe('vibrant')
    expect(localStorage.getItem(DOCS_THEME_STORAGE_KEY)).toBe('vibrant')
  })

  it('switches inside a view transition when the browser has them', () => {
    stubReducedMotion(false)
    const { updates } = installDeferredTransitions()

    switchDocsTheme('mono')
    // The attribute is written by the transition's update, not before it,
    // or the "before" snapshot would already show the new theme.
    expect(theme()).toBe('calm')
    expect(localStorage.getItem(DOCS_THEME_STORAGE_KEY)).toBe('mono')
    expect(updates).toHaveLength(1)

    void updates[0]?.()
    expect(theme()).toBe('mono')
  })

  it('skips the transition under reduced motion', () => {
    stubReducedMotion(true)
    const { updates } = installDeferredTransitions()

    switchDocsTheme('vibrant')
    expect(updates).toHaveLength(0)
    expect(theme()).toBe('vibrant')
  })

  it('ends on the latest theme when switches overlap', () => {
    stubReducedMotion(false)
    const { updates } = installDeferredTransitions()

    switchDocsTheme('vibrant')
    switchDocsTheme('mono')
    expect(updates).toHaveLength(2)

    // The skipped first transition still runs its update. It must not apply
    // the theme it was created for, in either order.
    void updates[0]?.()
    expect(theme()).toBe('mono')
    void updates[1]?.()
    expect(theme()).toBe('mono')
    expect(localStorage.getItem(DOCS_THEME_STORAGE_KEY)).toBe('mono')
  })

  it('still switches when storage is unavailable', () => {
    stubStorage(() => {
      throw new Error('storage disabled')
    })
    expect(() => {
      switchDocsTheme('default')
    }).not.toThrow()
    expect(theme()).toBe('default')
  })

  it('does not report a skipped transition as an unhandled rejection', async () => {
    stubReducedMotion(false)
    const ready = Promise.reject(new Error('Transition was skipped'))
    const caught = vi.spyOn(ready, 'catch')
    viewDocument.startViewTransition = (update) => {
      void update()
      return { ready, finished: Promise.resolve() }
    }

    const update = vi.fn()
    runDocsViewTransition(update)
    expect(update).toHaveBeenCalledTimes(1)
    expect(caught).toHaveBeenCalledTimes(1)
    await Promise.resolve()
  })
})
