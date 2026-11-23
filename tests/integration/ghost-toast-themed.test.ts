import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import { defineComponent, h, ref, type VNodeChild } from 'vue'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  GhostToastClose,
  GhostToastProvider,
  GhostToastTitle,
  useGhostToast,
  type GhostToastViewportItemSlotProps,
  type UseGhostToastReturn,
} from '../../packages/vue/src'
import {
  GhostToast,
  type GhostToastExposed,
} from '../../packages/themes/src/ghost-toast'
import {
  GhostToastViewport,
  type GhostToastViewportExposed,
} from '../../packages/themes/src/ghost-toast-viewport'

afterEach(() => {
  vi.useRealTimers()
  document.body.innerHTML = ''
})

// Registered after the cleanup hook so it runs first (hooks run in stack order).
enableAutoUnmount(afterEach)

function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, '')
}

interface HarnessOptions {
  viewportProps?: Record<string, unknown>
  viewportSlots?: Record<string, (props: never) => VNodeChild>
}

function mountThemed(options: HarnessOptions = {}) {
  let captured: UseGhostToastReturn | undefined
  const Capture = defineComponent({
    setup() {
      captured = useGhostToast()
      return () => null
    },
  })
  const viewportRef = ref<GhostToastViewportExposed | null>(null)
  const wrapper = mount(
    defineComponent({
      setup() {
        return () =>
          h(GhostToastProvider, null, () => [
            h(Capture),
            h(
              GhostToastViewport,
              { ref: viewportRef, ...options.viewportProps },
              options.viewportSlots,
            ),
          ])
      },
    }),
    { attachTo: document.body },
  )
  return {
    wrapper,
    viewportRef,
    get api(): UseGhostToastReturn {
      if (!captured) throw new Error('useGhostToast was not captured')
      return captured
    },
  }
}

function region(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-part="viewport"]')
  if (!element) throw new Error('viewport not rendered')
  return element
}

function toastRoots(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-ghost-toast]')]
}

describe('themed GhostToastViewport', () => {
  it('portals a themed, named region and exposes its element', async () => {
    const { viewportRef } = mountThemed({
      viewportProps: { class: 'app-toasts' },
    })
    await flushPromises()

    const host = region()
    expect(host.parentElement).toBe(document.body)
    expect(host.getAttribute('role')).toBe('region')
    expect(host.getAttribute('aria-label')).toBe('Notifications')
    expect(host.hasAttribute('data-ghost-live')).toBe(true)
    expect(host.hasAttribute('data-themed')).toBe(true)
    expect(host.hasAttribute('data-inline')).toBe(false)
    expect(host.classList.contains('ghost-toast-viewport')).toBe(true)
    expect(host.classList.contains('app-toasts')).toBe(true)
    expect(viewportRef.value?.element).toBe(host)
  })

  it('marks an in-place viewport with data-inline and forwards `as`', async () => {
    const { wrapper } = mountThemed({
      viewportProps: { portal: false, as: 'section' },
    })
    await flushPromises()

    const host = region()
    expect((wrapper.element as Element).contains(host)).toBe(true)
    expect(host.tagName).toBe('SECTION')
    expect(host.hasAttribute('data-inline')).toBe(true)
  })

  it('renders records as themed toasts and maps type error to the danger tone', async () => {
    const { api } = mountThemed()
    await flushPromises()

    api.toast({ id: 'info', title: 'Saved', description: 'Stored.' })
    api.toast({
      id: 'error',
      type: 'error',
      title: 'Sync failed',
      action: { label: 'Retry', onClick: () => undefined },
    })
    await flushPromises()

    const [info, error] = toastRoots()
    expect(info?.hasAttribute('data-themed')).toBe(true)
    expect(info?.hasAttribute('data-tone')).toBe(false)
    expect(info?.hasAttribute('data-variant')).toBe(false)
    expect(info?.querySelector('[data-part="title"]')?.textContent).toBe(
      'Saved',
    )
    expect(info?.querySelector('[data-part="description"]')?.textContent).toBe(
      'Stored.',
    )
    expect(info?.querySelector('[data-part="action"]')).toBeNull()

    expect(error?.getAttribute('data-tone')).toBe('danger')
    expect(error?.getAttribute('data-type')).toBe('error')
    expect(error?.querySelector('[data-part="action"]')?.textContent).toBe(
      'Retry',
    )
  })

  it('keeps headless behavior: the action runs onClick and the icon close dismisses', async () => {
    const onClick = vi.fn()
    const onDismiss = vi.fn()
    const { api } = mountThemed()
    await flushPromises()

    api.toast({
      id: 'job',
      title: 'Export ready',
      action: { label: 'Open', onClick },
      onDismiss,
    })
    await flushPromises()

    const root = toastRoots()[0]
    root?.querySelector<HTMLButtonElement>('[data-part="action"]')?.click()
    expect(onClick).toHaveBeenCalledTimes(1)
    expect(toastRoots()).toHaveLength(1)

    const close = root?.querySelector<HTMLButtonElement>('[data-part="close"]')
    expect(close?.getAttribute('type')).toBe('button')
    expect(close?.getAttribute('aria-label')).toBe('Dismiss')
    expect(close?.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
    close?.click()
    await flushPromises()
    expect(toastRoots()).toHaveLength(0)
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('auto-dismisses informational toasts on the headless timer', async () => {
    vi.useFakeTimers()
    const { api } = mountThemed()
    await flushPromises()

    api.toast({ title: 'Saved' })
    await flushPromises()
    expect(toastRoots()).toHaveLength(1)

    vi.advanceTimersByTime(7_999)
    await flushPromises()
    expect(toastRoots()).toHaveLength(1)
    vi.advanceTimersByTime(1)
    await flushPromises()
    expect(toastRoots()).toHaveLength(0)
  })

  it('patches the same element on update so the enter animation does not replay (T7)', async () => {
    const { api } = mountThemed()
    await flushPromises()

    api.toast({ id: 'sync', type: 'error', title: 'Sync failed' })
    api.toast({ id: 'other', title: 'Other' })
    await flushPromises()
    const [before, other] = toastRoots()
    expect(before?.getAttribute('data-tone')).toBe('danger')

    api.update('sync', { type: 'default', title: 'Sync complete' })
    await flushPromises()
    const [after, otherAfter] = toastRoots()
    expect(after).toBe(before)
    expect(otherAfter).toBe(other)
    expect(after?.hasAttribute('data-tone')).toBe(false)
    expect(after?.querySelector('[data-part="title"]')?.textContent).toBe(
      'Sync complete',
    )

    // A repeated toast() with the same id merges into the same element too.
    api.toast({ id: 'sync', title: 'Sync complete again' })
    await flushPromises()
    expect(toastRoots()[0]).toBe(before)
    expect(toastRoots()).toHaveLength(2)
  })

  it('lets a consumer toast slot render themed toasts with variant and tone', async () => {
    const toastRef = ref<GhostToastExposed | null>(null)
    const { api } = mountThemed({
      viewportSlots: {
        toast: ({ toast }: GhostToastViewportItemSlotProps) =>
          h(
            GhostToast,
            {
              ref: toastRef,
              toast,
              variant: 'solid',
              tone: 'accent',
              class: 'custom-toast',
            },
            () => [
              h(GhostToastTitle, null, () => toast.title),
              h(GhostToastClose, null, () => 'Close'),
            ],
          ),
      },
    })
    await flushPromises()

    api.toast({ id: 'a', type: 'error', title: 'Invited' })
    await flushPromises()

    const root = toastRoots()[0]
    expect(root?.getAttribute('data-variant')).toBe('solid')
    // An explicit tone wins over the type-derived default.
    expect(root?.getAttribute('data-tone')).toBe('accent')
    expect(root?.classList.contains('ghost-toast')).toBe(true)
    expect(root?.classList.contains('custom-toast')).toBe(true)
    expect(toastRef.value?.element).toBe(root)
    expect(root?.querySelector('[data-part="close"]')?.textContent).toBe(
      'Close',
    )
  })

  it('forwards a consumer default slot that replaces the whole stack', async () => {
    const { api } = mountThemed({
      viewportSlots: {
        default: ({
          toasts,
        }: {
          toasts: readonly { id: string; title: string }[]
        }) =>
          h(
            'ul',
            { class: 'custom-stack' },
            toasts.map((toast) => h('li', { key: toast.id }, toast.title)),
          ),
      },
    })
    await flushPromises()

    api.toast({ title: 'One' })
    await flushPromises()
    expect(region().querySelector('.custom-stack')?.textContent).toBe('One')
    expect(toastRoots()).toHaveLength(0)
  })
})

describe('ghost-toast.css', () => {
  it('uses semantic tokens, enter-only motion gated on reduced motion, and forced-colors fallbacks', async () => {
    const css = stripComments(
      await readFile(
        resolve(process.cwd(), 'packages/themes/src/ghost-toast.css'),
        'utf8',
      ),
    )
    expect(css).toContain('.ghost-toast-viewport[data-themed]')
    expect(css).toContain('.ghost-toast[data-themed]')
    expect(css).toContain('--ghost-elevation-3-bg')
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i)
    expect(css).not.toMatch(/\b(?:rgb|hsl|oklch)a?\(/i)

    // One keyframes block that only animates in (no exit keyframes).
    expect(css.match(/@keyframes/g)).toHaveLength(1)
    expect(css).toContain('@keyframes ghost-toast-enter')
    expect(css).toContain('var(--ghost-motion-enter-duration)')
    expect(css).toContain('var(--ghost-motion-translate)')

    // Every `animation` declaration sits inside the no-preference query, so
    // prefers-reduced-motion: reduce gets no animation at all.
    const motionQuery = '@media (prefers-reduced-motion: no-preference)'
    const queryStart = css.indexOf(motionQuery)
    expect(queryStart).toBeGreaterThan(-1)
    const animationDeclarations = [...css.matchAll(/\banimation\s*:/g)]
    expect(animationDeclarations.length).toBeGreaterThan(0)
    const forcedColors = css.indexOf('@media (forced-colors: active)')
    for (const match of animationDeclarations) {
      expect(match.index).toBeGreaterThan(queryStart)
      expect(match.index).toBeLessThan(forcedColors)
    }
    expect(css).not.toContain('prefers-reduced-motion: reduce')
    expect(forcedColors).toBeGreaterThan(-1)
    expect(css).toContain('CanvasText')
  })
})
