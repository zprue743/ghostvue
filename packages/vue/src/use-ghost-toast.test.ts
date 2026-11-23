import { mount } from '@vue/test-utils'
import { defineComponent, h, nextTick } from 'vue'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'

import GhostToastProvider from './GhostToastProvider.vue'
import {
  createGhostToastStore,
  GHOST_TOAST_WAITING_WARNING_THRESHOLD,
  useGhostToast,
  type GhostToastStore,
} from './use-ghost-toast'

const STORE_KEY = 'ghost-toast-store-test'
const AUTO = `${STORE_KEY}:auto:`

function createStore(
  overrides: {
    duration?: number
    limit?: number
    isServer?: boolean
  } = {},
): GhostToastStore {
  return createGhostToastStore({
    storeKey: STORE_KEY,
    duration: () => overrides.duration,
    limit: () => overrides.limit,
    isServer: overrides.isServer ?? false,
  })
}

/** Store with a viewport attached, as after `GhostToastViewport` mounts. */
function createAttachedStore(
  overrides: Parameters<typeof createStore>[0] = {},
): GhostToastStore {
  const store = createStore(overrides)
  store.attachViewport()
  return store
}

function visibleIds(store: GhostToastStore): string[] {
  return store.api.toasts.value.map((record) => record.id)
}

let warn: MockInstance<typeof console.warn>

beforeEach(() => {
  vi.useFakeTimers()
  warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

function warnedCodes(): string[] {
  return warn.mock.calls.map((call: unknown[]) => {
    const match = /\[ghostvue (GHOST\d{3})\]/.exec(String(call[0]))
    return match?.[1] ?? String(call[0])
  })
}

describe('toast store: FIFO visibility', () => {
  it('shows the oldest `limit` toasts and promotes the next one on dismiss', () => {
    const store = createAttachedStore({ limit: 3 })
    const ids = ['a', 'b', 'c', 'd'].map((id) =>
      store.api.toast({ id, title: id }),
    )
    expect(visibleIds(store)).toEqual(['a', 'b', 'c'])

    store.api.dismiss('b')
    expect(visibleIds(store)).toEqual(['a', 'c', 'd'])
    expect(ids).toEqual(['a', 'b', 'c', 'd'])
  })

  it('removes a waiting toast without promotion side effects', () => {
    const store = createAttachedStore({ limit: 1 })
    store.api.toast({ id: 'a', title: 'A' })
    store.api.toast({ id: 'b', title: 'B' })
    store.api.toast({ id: 'c', title: 'C' })
    store.api.dismiss('b')
    expect(visibleIds(store)).toEqual(['a'])
    store.api.dismiss('a')
    expect(visibleIds(store)).toEqual(['c'])
  })

  it('defaults to three visible toasts', () => {
    const store = createAttachedStore()
    for (let index = 0; index < 5; index += 1) {
      store.api.toast({ title: `T${String(index)}` })
    }
    expect(store.api.toasts.value).toHaveLength(3)
  })

  it('does not count waiting time against the auto-dismiss budget', () => {
    const store = createAttachedStore({ limit: 1 })
    store.api.toast({ id: 'a', title: 'A', duration: null })
    store.api.toast({ id: 'b', title: 'B', duration: 1000 })
    vi.advanceTimersByTime(5000)
    store.api.dismiss('a')
    expect(visibleIds(store)).toEqual(['b'])
    vi.advanceTimersByTime(999)
    expect(visibleIds(store)).toEqual(['b'])
    vi.advanceTimersByTime(1)
    expect(visibleIds(store)).toEqual([])
  })
})

describe('toast store: duration resolution', () => {
  it('auto-dismisses informational toasts after 8000 ms by default', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'info', title: 'Saved' })
    expect(store.api.toasts.value[0]?.duration).toBe(8000)
    vi.advanceTimersByTime(7999)
    expect(visibleIds(store)).toEqual(['info'])
    vi.advanceTimersByTime(1)
    expect(visibleIds(store)).toEqual([])
  })

  it('persists error and action toasts and warns when duration is set', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'err', title: 'Failed', type: 'error' })
    store.api.toast({
      id: 'err-timed',
      title: 'Failed',
      type: 'error',
      duration: 5000,
    })
    store.api.toast({
      id: 'act',
      title: 'Deleted',
      action: { label: 'Undo', onClick: () => undefined },
      duration: 1000,
    })
    vi.advanceTimersByTime(60_000)
    expect(visibleIds(store)).toEqual(['err', 'err-timed', 'act'])
    expect(store.api.toasts.value.every((t) => t.duration === null)).toBe(true)
    expect(warnedCodes()).toEqual(['GHOST007', 'GHOST007'])
  })

  it('treats null and 0 as persist and positive values as milliseconds', () => {
    const store = createAttachedStore({ limit: 5 })
    store.api.toast({ id: 'null', title: 'A', duration: null })
    store.api.toast({ id: 'zero', title: 'B', duration: 0 })
    store.api.toast({ id: 'five', title: 'C', duration: 5000 })
    vi.advanceTimersByTime(5000)
    expect(visibleIds(store)).toEqual(['null', 'zero'])
  })

  it('warns on negative or NaN duration and falls back to the provider default', () => {
    const store = createAttachedStore({ duration: 3000, limit: 5 })
    store.api.toast({ id: 'neg', title: 'A', duration: -1 })
    store.api.toast({ id: 'nan', title: 'B', duration: Number.NaN })
    expect(store.api.toasts.value.map((t) => t.duration)).toEqual([3000, 3000])
    expect(warnedCodes()).toEqual(['GHOST008', 'GHOST008'])
  })

  it('persists informational toasts when the provider duration is 0', () => {
    const store = createAttachedStore({ duration: 0 })
    store.api.toast({ id: 'a', title: 'A' })
    vi.advanceTimersByTime(60_000)
    expect(visibleIds(store)).toEqual(['a'])
  })

  it('uses 8000 for an invalid provider duration', () => {
    const store = createAttachedStore({ duration: Number.POSITIVE_INFINITY })
    store.api.toast({ id: 'a', title: 'A' })
    expect(store.api.toasts.value[0]?.duration).toBe(8000)
  })
})

describe('toast store: identity', () => {
  it('generates `${storeKey}:auto:${n}` ids from 1', () => {
    const store = createAttachedStore()
    expect(store.api.toast({ title: 'A' })).toBe(`${AUTO}1`)
    expect(store.api.toast({ title: 'B' })).toBe(`${AUTO}2`)
  })

  it('warns when an explicit id uses the auto prefix and never creates it', () => {
    const store = createAttachedStore()
    store.api.toast({ id: `${AUTO}9`, title: 'Fake' })
    expect(visibleIds(store)).toEqual([])
    expect(warnedCodes()).toEqual(['GHOST009'])
  })

  it('treats a prefixed id that matches a generated record as an update', () => {
    const store = createAttachedStore()
    const id = store.api.toast({ title: 'Original' })
    store.api.toast({ id, title: 'Changed' })
    expect(store.api.toasts.value.map((t) => t.title)).toEqual(['Changed'])
    expect(warnedCodes()).toEqual(['GHOST009'])
  })

  it('merges a reused id in place without a duplicate visible slot (T4)', () => {
    const store = createAttachedStore({ limit: 2 })
    store.api.toast({ id: 'save', title: 'Saving', duration: null })
    store.api.toast({ id: 'other', title: 'Other' })
    store.api.toast({ id: 'save', title: 'Saved', description: 'Done' })
    expect(store.api.toasts.value.map((t) => [t.id, t.title])).toEqual([
      ['save', 'Saved'],
      ['other', 'Other'],
    ])
    expect(store.api.toasts.value[0]?.description).toBe('Done')
  })

  it('merges a reused id while it is still waiting', () => {
    const store = createAttachedStore({ limit: 1 })
    store.api.toast({ id: 'a', title: 'A', duration: null })
    store.api.toast({ id: 'b', title: 'B1' })
    store.api.toast({ id: 'b', title: 'B2' })
    store.api.dismiss('a')
    expect(store.api.toasts.value.map((t) => t.title)).toEqual(['B2'])
  })

  it('ignores toast() without a non-empty title', () => {
    const store = createAttachedStore()
    store.api.toast({ title: '   ' })
    expect(visibleIds(store)).toEqual([])
    expect(warnedCodes()).toEqual(['GHOST011'])
  })
})

describe('toast store: pause and remaining time', () => {
  it('pauses for overlapping hover, focus, and hidden reasons without losing time', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'a', title: 'A', duration: 10_000 })

    vi.advanceTimersByTime(2000)
    store.setPaused('a', 'hover', true)
    expect(store.api.toasts.value[0]?.remainingMs).toBe(8000)
    vi.advanceTimersByTime(1000)
    store.setPaused('a', 'focus', true)
    store.setPageHidden(true)
    expect(store.api.toasts.value[0]?.pauseReasons).toEqual([
      'hover',
      'focus',
      'hidden',
    ])
    vi.advanceTimersByTime(30_000)
    store.setPaused('a', 'hover', false)
    store.setPageHidden(false)
    vi.advanceTimersByTime(30_000)
    // Still focused: nothing counted.
    expect(store.api.toasts.value[0]?.remainingMs).toBe(8000)
    expect(visibleIds(store)).toEqual(['a'])

    store.setPaused('a', 'focus', false)
    vi.advanceTimersByTime(7999)
    expect(visibleIds(store)).toEqual(['a'])
    vi.advanceTimersByTime(1)
    expect(visibleIds(store)).toEqual([])
  })

  it('restarts the full budget when update() lengthens the duration', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'a', title: 'A', duration: 2000 })
    vi.advanceTimersByTime(1500)
    store.api.update('a', { duration: 4000 })
    vi.advanceTimersByTime(3999)
    expect(visibleIds(store)).toEqual(['a'])
    vi.advanceTimersByTime(1)
    expect(visibleIds(store)).toEqual([])
  })

  it('keeps elapsed time and clamps to zero when update() shortens it', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'a', title: 'A', duration: 5000 })
    vi.advanceTimersByTime(3000)
    store.api.update('a', { duration: 4000 })
    vi.advanceTimersByTime(999)
    expect(visibleIds(store)).toEqual(['a'])
    vi.advanceTimersByTime(1)
    expect(visibleIds(store)).toEqual([])

    store.api.toast({ id: 'b', title: 'B', duration: 5000 })
    vi.advanceTimersByTime(3000)
    store.api.update('b', { duration: 1000 })
    vi.advanceTimersByTime(0)
    expect(visibleIds(store)).toEqual([])
  })

  it('stops the timer when update() makes a toast persist', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'a', title: 'A' })
    store.api.update('a', { type: 'error' })
    vi.advanceTimersByTime(60_000)
    expect(store.api.toasts.value[0]?.remainingMs).toBeNull()
  })

  it('re-resolves informational toasts when the provider duration changes', () => {
    let duration = 8000
    const store = createGhostToastStore({
      storeKey: STORE_KEY,
      duration: () => duration,
      limit: () => 3,
      isServer: false,
    })
    store.attachViewport()
    store.api.toast({ id: 'a', title: 'A' })
    duration = 0
    store.refresh()
    vi.advanceTimersByTime(60_000)
    expect(visibleIds(store)).toEqual(['a'])
  })
})

describe('toast store: update and dismiss races', () => {
  it('does not resurrect a dismissed toast through a later update', () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'a', title: 'A' })
    store.api.update('a', { title: 'A2' })
    store.api.dismiss('a')
    store.api.update('a', { title: 'A3' })
    expect(visibleIds(store)).toEqual([])
  })

  it('handles dismiss of the promoted toast from inside onDismiss', () => {
    const store = createAttachedStore({ limit: 1 })
    store.api.toast({
      id: 'a',
      title: 'A',
      onDismiss: () => {
        store.api.dismiss('b')
      },
    })
    store.api.toast({ id: 'b', title: 'B' })
    store.api.toast({ id: 'c', title: 'C' })
    store.api.dismiss('a')
    expect(visibleIds(store)).toEqual(['c'])
  })

  it('calls onDismiss once per toast and not for in-place updates', () => {
    const store = createAttachedStore()
    const onDismiss = vi.fn()
    store.api.toast({ id: 'a', title: 'A', onDismiss })
    store.api.toast({ id: 'a', title: 'A2' })
    store.api.update('a', { description: 'More' })
    expect(onDismiss).not.toHaveBeenCalled()
    store.api.dismiss('a')
    store.api.dismiss('a')
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })

  it('dismissAll clears visible and waiting toasts and cancels timers', () => {
    const store = createAttachedStore({ limit: 1 })
    const calls: string[] = []
    store.api.toast({ id: 'a', title: 'A', onDismiss: () => calls.push('a') })
    store.api.toast({ id: 'b', title: 'B', onDismiss: () => calls.push('b') })
    store.api.dismissAll()
    expect(visibleIds(store)).toEqual([])
    vi.advanceTimersByTime(60_000)
    expect(calls).toEqual(['a', 'b'])
  })

  it('dispose dismisses everything once and ignores later calls', () => {
    const store = createAttachedStore()
    const onDismiss = vi.fn()
    store.api.toast({ id: 'a', title: 'A', onDismiss })
    store.dispose()
    expect(onDismiss).toHaveBeenCalledTimes(1)
    store.api.toast({ id: 'b', title: 'B' })
    expect(visibleIds(store)).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })
})

describe('toast store: announcements', () => {
  it('announces on show through the region its urgency selects', async () => {
    const store = createAttachedStore()
    store.api.toast({ title: 'Saved', description: 'Draft stored.' })
    expect(store.politeAnnouncement.value).toEqual({
      key: 1,
      text: 'Saved Draft stored.',
    })
    expect(store.assertiveAnnouncement.value.text).toBe('')
    await nextTick()
    store.api.toast({ title: 'Payment failed', urgency: 'urgent' })
    expect(store.assertiveAnnouncement.value).toEqual({
      key: 1,
      text: 'Payment failed',
    })
    expect(store.politeAnnouncement.value.key).toBe(1)
  })

  it('increments the key for identical consecutive text', async () => {
    const store = createAttachedStore()
    store.api.toast({ title: 'Saved', duration: null })
    await nextTick()
    store.api.toast({ title: 'Saved', duration: null })
    expect(store.politeAnnouncement.value).toEqual({ key: 2, text: 'Saved' })
  })

  it('joins shows from one tick into one atomic string', () => {
    const store = createAttachedStore()
    store.api.toast({ title: 'One' })
    store.api.toast({ title: 'Two' })
    expect(store.politeAnnouncement.value.text).toBe('One Two')
  })

  it('announces waiting toasts only when they become visible', async () => {
    const store = createAttachedStore({ limit: 1 })
    store.api.toast({ id: 'a', title: 'First', duration: null })
    await nextTick()
    store.api.toast({ id: 'b', title: 'Second' })
    expect(store.politeAnnouncement.value.text).toBe('First')
    await nextTick()
    store.api.dismiss('a')
    expect(store.politeAnnouncement.value).toEqual({ key: 2, text: 'Second' })
  })

  it('re-announces an update only with announceUpdate (T2)', async () => {
    const store = createAttachedStore()
    store.api.toast({ id: 'job', title: 'Uploading', duration: null })
    await nextTick()
    store.api.update('job', { title: 'Uploading 50%' })
    expect(store.politeAnnouncement.value).toEqual({
      key: 1,
      text: 'Uploading',
    })
    store.api.update('job', {
      title: 'Upload failed',
      urgency: 'urgent',
      announceUpdate: true,
    })
    expect(store.assertiveAnnouncement.value).toEqual({
      key: 1,
      text: 'Upload failed',
    })
    expect(store.politeAnnouncement.value.key).toBe(1)
  })

  it('does not announce an update of a waiting toast', () => {
    const store = createAttachedStore({ limit: 1 })
    store.api.toast({ id: 'a', title: 'A', duration: null })
    store.api.toast({ id: 'b', title: 'B' })
    store.api.update('b', { title: 'B2', announceUpdate: true })
    expect(store.politeAnnouncement.value.text).toBe('A')
  })
})

describe('toast store: pre-mount and SSR (T1)', () => {
  it('waits silently until a viewport attaches, then flushes', () => {
    const store = createStore()
    store.api.toast({ id: 'early', title: 'Early', duration: 1000 })
    expect(visibleIds(store)).toEqual([])
    expect(store.politeAnnouncement.value.text).toBe('')
    vi.advanceTimersByTime(5000)

    store.attachViewport()
    expect(visibleIds(store)).toEqual(['early'])
    expect(store.politeAnnouncement.value.text).toBe('Early')
    vi.advanceTimersByTime(999)
    expect(visibleIds(store)).toEqual(['early'])
    vi.advanceTimersByTime(1)
    expect(visibleIds(store)).toEqual([])
  })

  it('freezes timers while no viewport is attached', () => {
    const store = createStore()
    const detach = store.attachViewport()
    store.api.toast({ id: 'a', title: 'A', duration: 1000 })
    vi.advanceTimersByTime(400)
    detach()
    vi.advanceTimersByTime(10_000)
    expect(visibleIds(store)).toEqual(['a'])
    store.attachViewport()
    vi.advanceTimersByTime(600)
    expect(visibleIds(store)).toEqual([])
  })

  it('is a no-op with a development warning on the server', () => {
    const store = createStore({ isServer: true })
    store.api.toast({ id: 'ssr', title: 'Server' })
    store.attachViewport()
    expect(visibleIds(store)).toEqual([])
    expect(warnedCodes()).toEqual(['GHOST006'])
  })
})

describe('toast store: waiting queue (T4)', () => {
  it(`warns once when more than ${String(GHOST_TOAST_WAITING_WARNING_THRESHOLD)} toasts wait and keeps accepting`, () => {
    const store = createAttachedStore({ limit: 1 })
    const total = 1 + GHOST_TOAST_WAITING_WARNING_THRESHOLD + 5
    for (let index = 0; index < total; index += 1) {
      store.api.toast({ id: `t${String(index)}`, title: 'T', duration: null })
    }
    expect(warnedCodes()).toEqual(['GHOST010'])
    for (let index = 0; index < total; index += 1) {
      store.api.dismiss(`t${String(index)}`)
      if (index < total - 1) {
        expect(visibleIds(store)).toEqual([`t${String(index + 1)}`])
      }
    }
    expect(visibleIds(store)).toEqual([])
  })
})

describe('useGhostToast', () => {
  it('throws outside GhostToastProvider', () => {
    const Consumer = defineComponent({
      setup() {
        useGhostToast()
        return () => null
      },
    })
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    expect(() => mount(Consumer)).toThrow(/inside GhostToastProvider/)
    error.mockRestore()
  })

  it('keeps sibling providers isolated', () => {
    const apis: ReturnType<typeof useGhostToast>[] = []
    const Consumer = defineComponent({
      setup() {
        apis.push(useGhostToast())
        return () => null
      },
    })
    const Root = defineComponent({
      setup() {
        return () => [
          h(GhostToastProvider, null, () => h(Consumer)),
          h(GhostToastProvider, null, () => h(Consumer)),
        ]
      },
    })
    const wrapper = mount(Root)
    const [first, second] = apis
    const firstId = first?.toast({ title: 'A' })
    const secondId = second?.toast({ title: 'B' })
    expect(firstId).not.toBe(secondId)
    first?.dismissAll()
    expect(second?.toasts).not.toBe(first?.toasts)
    wrapper.unmount()
  })
})
