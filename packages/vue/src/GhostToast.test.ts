import { enableAutoUnmount, flushPromises, mount } from '@vue/test-utils'
import {
  defineComponent,
  h,
  nextTick,
  ref,
  type Component,
  type VNodeChild,
} from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import GhostDialog from './GhostDialog.vue'
import GhostDialogContent from './GhostDialogContent.vue'
import GhostDialogTitle from './GhostDialogTitle.vue'
import GhostToast from './GhostToast.vue'
import GhostToastAction from './GhostToastAction.vue'
import GhostToastClose from './GhostToastClose.vue'
import GhostToastDescription from './GhostToastDescription.vue'
import GhostToastProvider from './GhostToastProvider.vue'
import GhostToastTitle from './GhostToastTitle.vue'
import GhostToastViewport from './GhostToastViewport.vue'
import type {
  GhostToastActionExposed,
  GhostToastExposed,
  GhostToastViewportExposed,
  UseGhostToastOptions,
  UseGhostToastReturn,
} from './ghost-toast'
import { useGhostToast } from './use-ghost-toast'

let warn: MockInstance<typeof console.warn>

beforeEach(() => {
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

// Registered after the cleanup hook so it runs first (hooks run in stack order).
enableAutoUnmount(afterEach)

function warnedCodes(): string[] {
  return warn.mock.calls.map((call: unknown[]) => {
    const match = /\[ghostvue (GHOST\d{3})\]/.exec(String(call[0]))
    return match?.[1] ?? String(call[0])
  })
}

/** Captures `useGhostToast()` from a descendant of the provider. */
function apiCapture(options?: UseGhostToastOptions) {
  let captured: UseGhostToastReturn | undefined
  const Capture = defineComponent({
    setup() {
      captured = useGhostToast(options)
      return () => null
    },
  })
  return {
    Capture,
    get api(): UseGhostToastReturn {
      if (!captured) throw new Error('useGhostToast was not captured')
      return captured
    },
  }
}

interface HarnessOptions {
  providerProps?: Record<string, unknown>
  viewportProps?: Record<string, unknown>
  viewportSlots?: Record<string, (props: never) => VNodeChild>
  showViewport?: () => boolean
  before?: () => VNodeChild
  apiOptions?: UseGhostToastOptions
}

function mountToasts(options: HarnessOptions = {}) {
  const capture = apiCapture(options.apiOptions)
  const viewportRef = ref<GhostToastViewportExposed | null>(null)
  const wrapper = mount(
    defineComponent({
      setup() {
        return () => [
          options.before?.(),
          h(GhostToastProvider, options.providerProps ?? null, () => [
            h(capture.Capture),
            (options.showViewport?.() ?? true)
              ? h(
                  GhostToastViewport,
                  {
                    ref: viewportRef,
                    portal: false,
                    ...options.viewportProps,
                  },
                  options.viewportSlots,
                )
              : null,
          ]),
        ]
      },
    }),
    { attachTo: document.body },
  )
  return { wrapper, capture, viewportRef }
}

function query(selector: string): HTMLElement {
  const element = document.querySelector(selector)
  if (!(element instanceof HTMLElement)) {
    throw new Error(`Missing ${selector}`)
  }
  return element
}

function toastRoots(): HTMLElement[] {
  return [...document.querySelectorAll<HTMLElement>('[data-ghost-toast]')]
}

describe('GhostToastViewport', () => {
  it('renders a named region with data-ghost-live and empty announcers', () => {
    const { viewportRef } = mountToasts()
    const region = query('[data-part="viewport"]')
    expect(region.getAttribute('role')).toBe('region')
    expect(region.getAttribute('aria-label')).toBe('Notifications')
    expect(region.hasAttribute('data-ghost-live')).toBe(true)
    expect(region.classList.contains('ghost-toast-viewport')).toBe(true)
    expect(region.tagName).toBe('DIV')
    expect(region.children).toHaveLength(0)
    expect(viewportRef.value?.element).toBe(region)

    const polite = query('[data-part="announcer-polite"]')
    expect(polite.getAttribute('role')).toBe('status')
    expect(polite.getAttribute('aria-live')).toBe('polite')
    expect(polite.getAttribute('aria-atomic')).toBe('true')
    expect(polite.hasAttribute('data-ghost-live')).toBe(true)
    expect(polite.textContent).toBe('')

    const assertive = query('[data-part="announcer-assertive"]')
    expect(assertive.getAttribute('role')).toBe('alert')
    expect(assertive.getAttribute('role')).not.toBe('status')
    expect(assertive.hasAttribute('aria-live')).toBe(false)
    expect(assertive.textContent).toBe('')
  })

  it('uses the provider label and section host', () => {
    mountToasts({
      providerProps: { label: 'Alerts' },
      viewportProps: { as: 'section', class: 'mine', 'data-x': '1' },
    })
    const region = query('[data-part="viewport"]')
    expect(region.tagName).toBe('SECTION')
    expect(region.getAttribute('aria-label')).toBe('Alerts')
    expect(region.className).toBe('mine ghost-toast-viewport')
    expect(region.getAttribute('data-x')).toBe('1')
  })

  it('passes consumer aria-labelledby through and drops the default aria-label (T3)', () => {
    mountToasts({ viewportProps: { 'aria-labelledby': 'heading' } })
    const region = query('[data-part="viewport"]')
    expect(region.getAttribute('aria-labelledby')).toBe('heading')
    expect(region.hasAttribute('aria-label')).toBe(false)
  })

  it('teleports to body by default and renders in place with portal=false', async () => {
    const host = document.createElement('div')
    document.body.append(host)
    const capture = apiCapture()
    const portaled = mount(
      defineComponent({
        setup: () => () =>
          h('main', { id: 'app-main' }, [
            h(GhostToastProvider, null, () => [
              h(capture.Capture),
              h(GhostToastViewport),
            ]),
          ]),
      }),
      { attachTo: host },
    )
    await nextTick()
    const region = query('[data-part="viewport"]')
    expect(region.parentElement).toBe(document.body)
    expect(document.querySelector('#app-main [data-part="viewport"]')).toBe(
      null,
    )
    expect(query('[data-part="announcer-polite"]').parentElement).toBe(
      document.body,
    )

    portaled.unmount()
    mountToasts()
    expect(query('[data-part="viewport"]').parentElement?.tagName).toBe('DIV')
  })

  it('renders the default structure for visible toasts only', async () => {
    const { capture } = mountToasts({ providerProps: { limit: 2 } })
    const onClick = vi.fn()
    capture.api.toast({
      title: 'Deleted',
      description: '3 files',
      action: { label: 'Undo', onClick },
    })
    capture.api.toast({ title: 'Second' })
    capture.api.toast({ title: 'Third (waiting)' })
    await nextTick()
    const roots = toastRoots()
    expect(roots).toHaveLength(2)
    const first = roots[0]
    expect(first?.getAttribute('data-part')).toBe('root')
    expect(first?.classList.contains('ghost-toast')).toBe(true)
    expect(first?.hasAttribute('role')).toBe(false)
    expect(first?.querySelector('[data-part="title"]')?.textContent).toBe(
      'Deleted',
    )
    expect(first?.querySelector('[data-part="description"]')?.textContent).toBe(
      '3 files',
    )
    const action = first?.querySelector<HTMLButtonElement>(
      '[data-part="action"]',
    )
    expect(action?.type).toBe('button')
    action?.click()
    expect(onClick).toHaveBeenCalledOnce()
    // The action does not dismiss.
    await nextTick()
    expect(toastRoots()).toHaveLength(2)
    expect(roots[1]?.querySelector('[data-part="action"]')).toBeNull()
    expect(document.body.textContent).not.toContain('Third')
  })

  it('renders consumer content through the toast and default slots', async () => {
    const { capture, wrapper } = mountToasts({
      viewportSlots: {
        toast: ({ toast }: { toast: { title: string } }) =>
          h('p', { class: 'custom' }, toast.title),
      },
    })
    capture.api.toast({ title: 'Custom' })
    await nextTick()
    expect(query('.custom').textContent).toBe('Custom')

    wrapper.unmount()
    const second = mountToasts({
      viewportSlots: {
        default: ({ toasts }: { toasts: readonly { id: string }[] }) =>
          h(
            'ol',
            toasts.map((toast) => h('li', { key: toast.id }, toast.id)),
          ),
      },
    })
    second.capture.api.toast({ id: 'whole', title: 'Whole stack' })
    await nextTick()
    expect(query('ol').textContent).toBe('whole')
  })

  it('updates only the polite region for default shows and only the assertive one for urgent', async () => {
    const { capture } = mountToasts()
    capture.api.toast({ title: 'Saved', description: 'Draft stored.' })
    await nextTick()
    const polite = query('[data-part="announcer-polite"]')
    const assertive = query('[data-part="announcer-assertive"]')
    expect(polite.textContent).toBe('Saved Draft stored.')
    expect(assertive.textContent).toBe('')

    capture.api.toast({ title: 'Card declined', urgency: 'urgent' })
    await nextTick()
    expect(assertive.textContent).toBe('Card declined')
    expect(polite.textContent).toBe('Saved Draft stored.')
  })

  it('replaces the keyed announcer child on every show, even for identical text', async () => {
    const { capture } = mountToasts()
    capture.api.toast({ title: 'Saved', duration: null })
    await nextTick()
    const firstChild = query('[data-part="announcer-polite"] > span')
    capture.api.toast({ title: 'Saved', duration: null })
    await nextTick()
    const secondChild = query('[data-part="announcer-polite"] > span')
    expect(secondChild).not.toBe(firstChild)
    expect(secondChild.textContent).toBe('Saved')
  })

  it('re-announces on update() only with announceUpdate (T2)', async () => {
    const { capture } = mountToasts()
    capture.api.toast({ id: 'job', title: 'Uploading', duration: null })
    await nextTick()
    const polite = query('[data-part="announcer-polite"]')
    const before = polite.firstElementChild
    capture.api.update('job', { title: 'Uploading 50%' })
    await nextTick()
    expect(polite.firstElementChild).toBe(before)
    expect(polite.textContent).toBe('Uploading')
    expect(toastRoots()[0]?.textContent).toContain('Uploading 50%')

    capture.api.update('job', { title: 'Uploaded', announceUpdate: true })
    await nextTick()
    expect(polite.firstElementChild).not.toBe(before)
    expect(polite.textContent).toBe('Uploaded')
    expect(query('[data-part="announcer-assertive"]').textContent).toBe('')
  })

  it('never moves focus when toasts are created, updated, promoted, or expire', async () => {
    vi.useFakeTimers()
    const button = document.createElement('button')
    document.body.append(button)
    button.focus()
    const { capture } = mountToasts({ providerProps: { limit: 1 } })
    capture.api.toast({ id: 'a', title: 'A', duration: 100 })
    capture.api.toast({ id: 'b', title: 'B', duration: 100 })
    await nextTick()
    capture.api.update('a', { title: 'A2', announceUpdate: true })
    await nextTick()
    vi.advanceTimersByTime(250)
    await nextTick()
    expect(toastRoots()).toHaveLength(0)
    expect(document.activeElement).toBe(button)
  })
})

describe('GhostToast parts', () => {
  it('Close dismisses its toast, emits click after, and does not focus itself on insert', async () => {
    const order: string[] = []
    const { capture } = mountToasts({
      viewportSlots: {
        toast: ({ toast }: { toast: never }) =>
          h(GhostToast, { toast }, () => [
            h(GhostToastTitle, () => 'Title'),
            h(
              GhostToastClose,
              {
                onClick: () => {
                  order.push(`click:${String(capture.api.toasts.value.length)}`)
                },
              },
              () => 'Close',
            ),
          ]),
      },
    })
    const before = document.activeElement
    capture.api.toast({ title: 'A', onDismiss: () => order.push('dismissed') })
    await nextTick()
    expect(document.activeElement).toBe(before)
    query('[data-part="close"]').click()
    await nextTick()
    expect(order).toEqual(['dismissed', 'click:0'])
    expect(toastRoots()).toHaveLength(0)
  })

  it('marks error toasts with data-type and leaves it off by default', async () => {
    const { capture } = mountToasts()
    capture.api.toast({ title: 'Info' })
    capture.api.toast({ title: 'Error', type: 'error' })
    await nextTick()
    const [info, error] = toastRoots()
    expect(info?.hasAttribute('data-type')).toBe(false)
    expect(error?.getAttribute('data-type')).toBe('error')
  })

  it('exposes elements and focus helpers', async () => {
    const toastRef = ref<GhostToastExposed | null>(null)
    const actionRef = ref<GhostToastActionExposed | null>(null)
    const closeRef = ref<GhostToastActionExposed | null>(null)
    const titleRef = ref<GhostToastExposed | null>(null)
    const descriptionRef = ref<GhostToastExposed | null>(null)
    const { capture } = mountToasts({
      viewportSlots: {
        toast: ({ toast }: { toast: never }) =>
          h(GhostToast, { toast, ref: toastRef }, () => [
            h(GhostToastTitle, { ref: titleRef }, () => 'T'),
            h(GhostToastDescription, { ref: descriptionRef }, () => 'D'),
            h(GhostToastAction, { ref: actionRef }, () => 'A'),
            h(GhostToastClose, { ref: closeRef }, () => 'C'),
          ]),
      },
    })
    capture.api.toast({ title: 'X', duration: null })
    await nextTick()
    expect(toastRef.value?.element).toBe(toastRoots()[0])
    expect(titleRef.value?.element?.getAttribute('data-part')).toBe('title')
    expect(descriptionRef.value?.element?.getAttribute('data-part')).toBe(
      'description',
    )
    actionRef.value?.focus()
    expect(document.activeElement).toBe(actionRef.value?.element)
    actionRef.value?.blur()
    closeRef.value?.focus()
    expect(document.activeElement).toBe(closeRef.value?.element)
    closeRef.value?.blur()
    expect(document.activeElement).toBe(document.body)
  })

  it('throws when parts are used outside their owners', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    for (const part of [
      GhostToastTitle,
      GhostToastDescription,
      GhostToastAction,
      GhostToastClose,
    ] as Component[]) {
      expect(() => mount(part)).toThrow(/must be used inside GhostToast/)
    }
    expect(() => mount(GhostToastViewport)).toThrow(/GhostToastProvider/)
    expect(() =>
      mount(GhostToast, {
        props: {
          toast: {
            id: 'x',
            type: 'default',
            urgency: 'default',
            title: 'x',
            description: undefined,
            action: undefined,
            duration: null,
            remainingMs: null,
            pauseReasons: [],
            state: 'visible',
          },
        },
      }),
    ).toThrow(/GhostToastProvider/)
    error.mockRestore()
  })
})

describe('pause behavior in the DOM', () => {
  it('pauses on hover and on focus within, and resumes on leave', async () => {
    vi.useFakeTimers()
    const { capture } = mountToasts()
    capture.api.toast({ id: 'a', title: 'A', duration: 1000 })
    await nextTick()
    const root = toastRoots()[0]
    if (!root) throw new Error('missing toast')

    root.dispatchEvent(new MouseEvent('mouseenter'))
    vi.advanceTimersByTime(5000)
    expect(capture.api.toasts.value[0]?.pauseReasons).toEqual(['hover'])

    const action = query('[data-part="close"]')
    action.focus()
    root.dispatchEvent(new MouseEvent('mouseleave'))
    vi.advanceTimersByTime(5000)
    expect(capture.api.toasts.value[0]?.pauseReasons).toEqual(['focus'])

    // Focus moving inside the toast keeps the pause.
    root.dispatchEvent(
      new FocusEvent('focusout', { bubbles: true, relatedTarget: action }),
    )
    expect(capture.api.toasts.value[0]?.pauseReasons).toEqual(['focus'])

    action.blur()
    vi.advanceTimersByTime(999)
    expect(capture.api.toasts.value).toHaveLength(1)
    vi.advanceTimersByTime(1)
    expect(capture.api.toasts.value).toHaveLength(0)
  })

  it('pauses while the page is hidden and removes the listener on unmount', async () => {
    vi.useFakeTimers()
    let hidden = false
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() =>
      hidden ? 'hidden' : 'visible',
    )
    const removeListener = vi.spyOn(document, 'removeEventListener')
    const { capture, wrapper } = mountToasts()
    capture.api.toast({ id: 'a', title: 'A', duration: 1000 })
    await nextTick()

    hidden = true
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(10_000)
    expect(capture.api.toasts.value[0]?.pauseReasons).toEqual(['hidden'])

    hidden = false
    document.dispatchEvent(new Event('visibilitychange'))
    vi.advanceTimersByTime(1000)
    expect(capture.api.toasts.value).toHaveLength(0)

    wrapper.unmount()
    expect(removeListener).toHaveBeenCalledWith(
      'visibilitychange',
      expect.any(Function),
    )
  })
})

describe('Escape and focus return (T5)', () => {
  it('dismisses only the focused toast, stops propagation, and restores prior focus', async () => {
    const outer = vi.fn()
    document.addEventListener('keydown', outer)
    const { capture } = mountToasts({
      before: () => h('button', { id: 'before' }, 'Before'),
    })
    capture.api.toast({ id: 'a', title: 'A', type: 'error' })
    capture.api.toast({ id: 'b', title: 'B', type: 'error' })
    await nextTick()

    const before = query('#before')
    before.focus()
    const close = toastRoots()[1]?.querySelector<HTMLElement>(
      '[data-part="close"]',
    )
    close?.focus()
    expect(document.activeElement).toBe(close)

    const event = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    close?.dispatchEvent(event)
    await nextTick()

    expect(capture.api.toasts.value.map((t) => t.id)).toEqual(['a'])
    expect(outer).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
    expect(document.activeElement).toBe(before)
    document.removeEventListener('keydown', outer)
  })

  it('ignores other keys, prevented events, and IME composition', async () => {
    const { capture } = mountToasts()
    capture.api.toast({ id: 'a', title: 'A', type: 'error' })
    await nextTick()
    const root = toastRoots()[0]
    root?.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    )
    root?.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        isComposing: true,
      }),
    )
    const prevented = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    prevented.preventDefault()
    root?.dispatchEvent(prevented)
    expect(capture.api.toasts.value).toHaveLength(1)
  })

  it('restores prior focus when Close removes a focused toast', async () => {
    const { capture } = mountToasts({
      before: () => h('input', { id: 'field' }),
    })
    capture.api.toast({ title: 'A', type: 'error' })
    await nextTick()
    const field = query('#field')
    field.focus()
    const close = query('[data-part="close"]')
    close.focus()
    close.click()
    await nextTick()
    expect(toastRoots()).toHaveLength(0)
    expect(document.activeElement).toBe(field)
  })

  it('keeps the return target while focus moves between toasts', async () => {
    const { capture } = mountToasts({
      before: () => h('input', { id: 'field' }),
    })
    capture.api.toast({ id: 'a', title: 'A', type: 'error' })
    capture.api.toast({ id: 'b', title: 'B', type: 'error' })
    await nextTick()
    query('#field').focus()
    const [first, second] = toastRoots().map((root) =>
      root.querySelector<HTMLElement>('[data-part="close"]'),
    )
    first?.focus()
    second?.focus()
    second?.click()
    await nextTick()
    expect(document.activeElement).toBe(query('#field'))
  })

  it('does not move focus when a toast that does not hold focus is removed', async () => {
    const { capture } = mountToasts({
      before: () => h('input', { id: 'field' }),
    })
    capture.api.toast({ id: 'a', title: 'A', type: 'error' })
    await nextTick()
    const other = document.createElement('button')
    document.body.append(other)
    other.focus()
    capture.api.dismiss('a')
    await nextTick()
    expect(document.activeElement).toBe(other)
  })

  it('stays operable above an open modal dialog: Escape keeps the dialog open', async () => {
    const capture = apiCapture()
    const open = ref(true)
    mount(
      defineComponent({
        setup: () => () =>
          h(GhostToastProvider, null, () => [
            h(capture.Capture),
            h(GhostToastViewport),
            h(
              GhostDialog,
              {
                open: open.value,
                'onUpdate:open': (value: boolean) => {
                  open.value = value
                },
              },
              () =>
                h(GhostDialogContent, () => [
                  h(GhostDialogTitle, () => 'Edit'),
                  h('button', { id: 'in-dialog' }, 'Inside'),
                ]),
            ),
          ]),
      }),
      { attachTo: document.body },
    )
    await flushPromises()
    capture.api.toast({ title: 'Saved', type: 'error' })
    await flushPromises()

    const region = query('[data-part="viewport"]')
    expect(region.hasAttribute('inert')).toBe(false)
    const inDialog = query('#in-dialog')
    inDialog.focus()
    const close = query('[data-part="close"]')
    close.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    close.focus()
    // The modal focus trap leaves focus in the live region.
    expect(document.activeElement).toBe(close)
    expect(open.value).toBe(true)

    close.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Escape',
        bubbles: true,
        cancelable: true,
      }),
    )
    await flushPromises()
    expect(toastRoots()).toHaveLength(0)
    expect(open.value).toBe(true)
    expect(document.activeElement).toBe(inDialog)
  })
})

describe('GhostToastProvider', () => {
  it('merges useGhostToast defaults into each call', async () => {
    const { capture } = mountToasts({
      apiOptions: { type: 'error', urgency: 'urgent' },
    })
    capture.api.toast({ id: 'x', title: 'X' })
    capture.api.toast({ id: 'y', title: 'Y', urgency: 'default' })
    await nextTick()
    expect(
      capture.api.toasts.value.map((t) => [t.id, t.type, t.urgency]),
    ).toEqual([
      ['x', 'error', 'urgent'],
      ['y', 'error', 'default'],
    ])
  })

  it('warns once for an invalid limit and falls back to 3', async () => {
    const { capture } = mountToasts({ providerProps: { limit: 0 } })
    for (let index = 0; index < 5; index += 1) {
      capture.api.toast({ title: `T${String(index)}` })
    }
    await nextTick()
    expect(toastRoots()).toHaveLength(3)
    expect(warnedCodes()).toEqual(['GHOST008'])
  })

  it('promotes waiting toasts when the limit grows', async () => {
    const limit = ref(1)
    const capture = apiCapture()
    mount(
      defineComponent({
        setup: () => () =>
          h(GhostToastProvider, { limit: limit.value }, () => [
            h(capture.Capture),
            h(GhostToastViewport, { portal: false }),
          ]),
      }),
      { attachTo: document.body },
    )
    capture.api.toast({ title: 'A' })
    capture.api.toast({ title: 'B' })
    await nextTick()
    expect(toastRoots()).toHaveLength(1)
    limit.value = 2
    await nextTick()
    await nextTick()
    expect(toastRoots()).toHaveLength(2)
  })

  it('dismisses every toast once on unmount and cancels timers', async () => {
    vi.useFakeTimers()
    const { capture, wrapper } = mountToasts({ providerProps: { limit: 1 } })
    const onDismiss = vi.fn()
    capture.api.toast({ title: 'A', onDismiss })
    capture.api.toast({ title: 'B', onDismiss })
    await nextTick()
    wrapper.unmount()
    expect(onDismiss).toHaveBeenCalledTimes(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('queues toasts on the client before the viewport mounts and flushes on mount (T1)', async () => {
    vi.useFakeTimers()
    const show = ref(false)
    const { capture } = mountToasts({ showViewport: () => show.value })
    capture.api.toast({ title: 'Early', duration: 1000 })
    vi.advanceTimersByTime(5000)
    expect(capture.api.toasts.value).toEqual([])

    show.value = true
    await nextTick()
    await nextTick()
    expect(toastRoots()).toHaveLength(1)
    expect(query('[data-part="announcer-polite"]').textContent).toBe('Early')
    vi.advanceTimersByTime(1000)
    await nextTick()
    expect(toastRoots()).toHaveLength(0)
  })
})
