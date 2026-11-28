import { mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { defineComponent, h, nextTick, ref } from 'vue'

import type { UseGhostPresenceReturn } from './ghost-presence'
import {
  measureComputedExitMotion,
  useGhostPresence,
} from './use-ghost-presence'

interface FakeAnimationInit {
  target: Element
  endTime?: number
  localTime?: number | null
  iterations?: number
  playbackRate?: number
  playState?: AnimationPlayState
  pseudoElement?: string | null
  /** Use only `getTiming()` (no `getComputedTiming`), like a minimal mock. */
  timingOnly?: { delay?: number; duration?: number; iterations?: number }
}

interface FakeAnimation {
  animation: Animation
  resolve: () => void
  reject: (reason: unknown) => void
}

/**
 * Minimal Web Animations double. Only the members `useGhostPresence` reads
 * are implemented, so the cast documents the narrowed surface.
 */
function fakeAnimation(init: FakeAnimationInit): FakeAnimation {
  let resolve!: () => void
  let reject!: (reason: unknown) => void
  const finished = new Promise<void>((res, rej) => {
    resolve = res
    reject = rej
  })
  // Unhandled-rejection noise when a test rejects before allSettled attaches.
  finished.catch(() => undefined)
  const effect: Record<string, unknown> = {
    target: init.target,
    pseudoElement: init.pseudoElement ?? null,
    getTiming: () => init.timingOnly ?? {},
  }
  if (!init.timingOnly) {
    effect['getComputedTiming'] = () => ({
      endTime: init.endTime ?? 120,
      localTime: init.localTime === undefined ? 0 : init.localTime,
      iterations: init.iterations ?? 1,
    })
  }
  const animation = {
    effect,
    finished,
    playState: init.playState ?? 'running',
    playbackRate: init.playbackRate ?? 1,
  } as unknown as Animation
  return { animation, resolve, reject }
}

interface Harness {
  present: ReturnType<typeof ref<boolean>>
  disabled: ReturnType<typeof ref<boolean>>
  api: UseGhostPresenceReturn
  onExitComplete: ReturnType<typeof vi.fn>
  surface: () => HTMLElement | null
  unmount: () => void
}

function mountHarness(
  initial = false,
  setup?: (el: HTMLElement) => void,
): Harness {
  const present = ref(initial)
  const disabled = ref(false)
  const onExitComplete = vi.fn()
  let api!: UseGhostPresenceReturn
  const Host = defineComponent({
    setup() {
      api = useGhostPresence({
        present: () => present.value,
        disabled: () => disabled.value,
        onExitComplete,
      })
      return () =>
        api.isPresent.value
          ? h(
              'div',
              {
                class: 'surface',
                'data-state': api.dataState.value,
                ref: (el) => {
                  if (el instanceof HTMLElement) {
                    setup?.(el)
                  }
                  api.setElement(el)
                },
              },
              [h('button', { type: 'button' }, 'Inside')],
            )
          : null
    },
  })
  const wrapper = mount(Host, { attachTo: document.body })
  return {
    present,
    disabled,
    api,
    onExitComplete,
    surface: () => document.querySelector<HTMLElement>('.surface'),
    unmount: () => {
      wrapper.unmount()
    },
  }
}

/** Narrows a value the test has just arranged to exist. */
function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) {
    throw new Error('Expected the test fixture to provide a value')
  }
  return value
}

/** jsdom has no `AnimationEvent`; the fallback reads only `animationName`. */
function animationEnd(animationName: string): Event {
  return Object.assign(new Event('animationend'), { animationName })
}

function flushPromises(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0)
  })
}

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  document.body.innerHTML = ''
})

describe('useGhostPresence state machine', () => {
  it('moves closed -> open -> exiting -> closed and keeps the node across the close render', async () => {
    const harness = mountHarness()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.surface()).toBeNull()

    harness.present.value = true
    await nextTick()
    const opened = harness.surface()
    expect(harness.api.phase.value).toBe('open')
    expect(opened?.dataset['state']).toBe('open')

    // getAnimations path with one running exit transition.
    const exit = fakeAnimation({ target: required(opened) })
    required(opened).getAnimations = () => [exit.animation]

    harness.present.value = false
    // Flipped synchronously, before the close render runs.
    expect(harness.api.phase.value).toBe('exiting')
    expect(harness.api.isPresent.value).toBe(true)
    expect(harness.api.isExiting.value).toBe(true)
    expect(harness.api.dataState.value).toBe('closed')
    await nextTick()
    expect(harness.surface()).toBe(opened)
    expect(opened?.dataset['state']).toBe('closed')

    exit.resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.surface()).toBeNull()
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('unmounts in the post-close flush when the surface has no motion (jsdom fallback)', async () => {
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    expect(harness.api.phase.value).toBe('exiting')
    await nextTick()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.surface()).toBeNull()
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('skips exiting entirely when disabled', async () => {
    const harness = mountHarness(true)
    await nextTick()
    harness.disabled.value = true
    harness.present.value = false
    expect(harness.api.phase.value).toBe('closed')
    await nextTick()
    expect(harness.surface()).toBeNull()
    expect(harness.onExitComplete).not.toHaveBeenCalled()
  })

  it('closes directly when present turns false before mount', () => {
    const present = ref(true)
    let api!: UseGhostPresenceReturn
    const Host = defineComponent({
      setup() {
        api = useGhostPresence({ present: () => present.value })
        present.value = false
        return () => null
      },
    })
    mount(Host)
    expect(api.phase.value).toBe('closed')
    expect(api.isPresent.value).toBe(false)
  })

  it('closes immediately when the element is missing or disconnected', async () => {
    const present = ref(true)
    let api!: UseGhostPresenceReturn
    const Host = defineComponent({
      setup() {
        api = useGhostPresence({ present: () => present.value })
        return () => h('div')
      },
    })
    mount(Host)
    present.value = false
    expect(api.phase.value).toBe('exiting')
    await nextTick()
    expect(api.phase.value).toBe('closed')
  })
})

describe('useGhostPresence Web Animations inspection', () => {
  async function openWith(
    animations: (el: HTMLElement) => Animation[],
  ): Promise<Harness> {
    const harness = mountHarness(false, (el) => {
      el.getAnimations = () => animations(el)
    })
    harness.present.value = true
    await nextTick()
    return harness
  }

  it('waits for every finite animation on the surface, including multi-iteration ones', async () => {
    let first: FakeAnimation | undefined
    let second: FakeAnimation | undefined
    const harness = await openWith((el) => {
      first ??= fakeAnimation({ target: el, endTime: 120 })
      second ??= fakeAnimation({ target: el, endTime: 300, iterations: 3 })
      return [first.animation, second.animation]
    })
    harness.present.value = false
    await nextTick()
    required(first).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('exiting')
    required(second).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('closed')
  })

  it('treats a cancelled animation (AbortError) as settled', async () => {
    let exit: FakeAnimation | undefined
    const harness = await openWith((el) => {
      exit ??= fakeAnimation({ target: el })
      return [exit.animation]
    })
    harness.present.value = false
    await nextTick()
    required(exit).reject(new DOMException('cancelled', 'AbortError'))
    await flushPromises()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('ignores descendant, pseudo-element, infinite, paused, zero-rate and settled animations', async () => {
    const harness = await openWith((el) => {
      const child = required(el.querySelector('button'))
      return [
        fakeAnimation({ target: child }).animation,
        fakeAnimation({ target: el, pseudoElement: '::before' }).animation,
        fakeAnimation({ target: el, iterations: Infinity }).animation,
        fakeAnimation({ target: el, endTime: Infinity }).animation,
        fakeAnimation({ target: el, playbackRate: 0 }).animation,
        fakeAnimation({ target: el, playState: 'paused' }).animation,
        fakeAnimation({ target: el, endTime: 120, localTime: 120 }).animation,
        fakeAnimation({ target: el, timingOnly: { duration: 0 } }).animation,
      ]
    })
    harness.present.value = false
    await nextTick()
    expect(harness.api.phase.value).toBe('closed')
  })

  it('awaits only the finite exit when an infinite animation runs alongside it', async () => {
    let exit: FakeAnimation | undefined
    const harness = await openWith((el) => {
      exit ??= fakeAnimation({ target: el, endTime: 120 })
      return [
        fakeAnimation({ target: el, iterations: Infinity, endTime: Infinity })
          .animation,
        exit.animation,
      ]
    })
    harness.present.value = false
    await nextTick()
    expect(harness.api.phase.value).toBe('exiting')
    required(exit).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('closed')
  })

  it('handles reversed playback and getTiming-only mocks', async () => {
    let reversed: FakeAnimation | undefined
    let timingOnly: FakeAnimation | undefined
    const harness = await openWith((el) => {
      reversed ??= fakeAnimation({
        target: el,
        playbackRate: -1,
        localTime: 60,
      })
      timingOnly ??= fakeAnimation({
        target: el,
        timingOnly: { delay: 10, duration: 50, iterations: 2 },
      })
      return [reversed.animation, timingOnly.animation]
    })
    harness.present.value = false
    await nextTick()
    required(reversed).resolve()
    required(timingOnly).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('closed')
  })
})

describe('useGhostPresence interrupted exits', () => {
  it('reopening mid-exit keeps the same node and ignores the stale completion', async () => {
    const exits: FakeAnimation[] = []
    const harness = mountHarness(false, (el) => {
      el.getAnimations = () => {
        const next = fakeAnimation({ target: el })
        exits.push(next)
        return [next.animation]
      }
    })
    harness.present.value = true
    await nextTick()
    const node = harness.surface()

    harness.present.value = false
    await nextTick()
    harness.present.value = true
    expect(harness.api.phase.value).toBe('open')
    await nextTick()

    required(exits[0]).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('open')
    expect(harness.surface()).toBe(node)
    expect(node?.dataset['state']).toBe('open')
    expect(harness.onExitComplete).not.toHaveBeenCalled()
  })

  it('open -> close -> reopen -> close completes only on the latest exit', async () => {
    const exits: FakeAnimation[] = []
    const harness = mountHarness(false, (el) => {
      el.getAnimations = () => {
        const next = fakeAnimation({ target: el })
        exits.push(next)
        return [next.animation]
      }
    })
    harness.present.value = true
    await nextTick()
    harness.present.value = false
    await nextTick()
    harness.present.value = true
    await nextTick()
    harness.present.value = false
    await nextTick()
    expect(exits).toHaveLength(2)

    required(exits[0]).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('exiting')
    expect(harness.surface()).not.toBeNull()

    required(exits[1]).resolve()
    await flushPromises()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('owner unmount mid-exit suppresses onExitComplete', async () => {
    let exit: FakeAnimation | undefined
    const harness = mountHarness(false, (el) => {
      el.getAnimations = () => {
        exit ??= fakeAnimation({ target: el })
        return [exit.animation]
      }
    })
    harness.present.value = true
    await nextTick()
    harness.present.value = false
    await nextTick()
    harness.unmount()
    required(exit).resolve()
    await flushPromises()
    expect(harness.onExitComplete).not.toHaveBeenCalled()
    expect(document.querySelector('.surface')).toBeNull()
  })
})

describe('useGhostPresence computed-style fallback', () => {
  // jsdom does not cascade motion longhands, so the surface reads a plain
  // object holding only the properties the fallback parser consumes.
  function stubComputedStyle(style: Record<string, string>): void {
    const original = window.getComputedStyle.bind(window)
    vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
      if (element instanceof HTMLElement && element.matches('.surface')) {
        return style as unknown as CSSStyleDeclaration
      }
      return original(element)
    })
  }

  it('keeps a zero-duration delayed transition mounted until its end event', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity',
      transitionDuration: '0ms',
      transitionDelay: '100ms',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())

    vi.advanceTimersByTime(99)
    expect(harness.api.phase.value).toBe('exiting')
    expect(node.isConnected).toBe(true)

    // A bubbled descendant event never ends the surface's own exit.
    required(node.querySelector('button')).dispatchEvent(
      new TransitionEvent('transitionend', {
        propertyName: 'opacity',
        bubbles: true,
      }),
    )
    expect(harness.api.phase.value).toBe('exiting')

    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'opacity' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.surface()).toBeNull()
  })

  it('converges at the safety deadline (ceil(total) + 34ms) without events', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity',
      transitionDuration: '0ms',
      transitionDelay: '100ms',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    vi.advanceTimersByTime(133)
    expect(harness.api.phase.value).toBe('exiting')
    vi.advanceTimersByTime(1)
    expect(harness.api.phase.value).toBe('closed')
  })

  it('scales finite iteration counts and ignores infinite animation end events', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'all',
      transitionDuration: '0s',
      transitionDelay: '0s',
      animationName: 'pulse, exit-fade',
      animationDuration: '1s, 100ms',
      animationDelay: '0s',
      animationIterationCount: 'infinite, 3',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())
    node.dispatchEvent(animationEnd('pulse'))
    expect(harness.api.phase.value).toBe('exiting')
    vi.advanceTimersByTime(333)
    expect(harness.api.phase.value).toBe('exiting')
    vi.advanceTimersByTime(1)
    expect(harness.api.phase.value).toBe('closed')
  })

  it('stays mounted until the last of several finite motions ends', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity, transform',
      transitionDuration: '100ms, 300ms',
      transitionDelay: '0s',
      animationName: 'exit-fade',
      animationDuration: '200ms',
      animationDelay: '0s',
      animationIterationCount: '1',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())

    vi.advanceTimersByTime(100)
    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'opacity' }),
    )
    // A repeated end for an already settled property settles nothing new.
    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'opacity' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('exiting')
    expect(node.isConnected).toBe(true)

    vi.advanceTimersByTime(100)
    node.dispatchEvent(animationEnd('exit-fade'))
    await nextTick()
    expect(harness.api.phase.value).toBe('exiting')
    expect(node.isConnected).toBe(true)

    vi.advanceTimersByTime(100)
    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'transform' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
    expect(harness.surface()).toBeNull()

    // The safety timer was cleared with the listeners.
    vi.advanceTimersByTime(1000)
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('never lets a long paused animation extend the exit', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity',
      transitionDuration: '100ms',
      transitionDelay: '0s',
      animationName: 'hold, exit-fade',
      animationDuration: '30s, 50ms',
      animationDelay: '0s',
      animationIterationCount: '1',
      animationPlayState: 'paused, running',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())

    vi.advanceTimersByTime(50)
    node.dispatchEvent(animationEnd('exit-fade'))
    await nextTick()
    expect(harness.api.phase.value).toBe('exiting')

    vi.advanceTimersByTime(50)
    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'opacity' }),
    )
    await nextTick()
    // The running motions settled; the paused 30s `hold` never gated removal.
    expect(harness.api.phase.value).toBe('closed')
    expect(harness.surface()).toBeNull()
    expect(harness.onExitComplete).toHaveBeenCalledTimes(1)
  })

  it('bounds the safety deadline by running motion only when a paused animation is present', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity',
      transitionDuration: '100ms',
      transitionDelay: '0s',
      animationName: 'hold',
      animationDuration: '30s',
      animationDelay: '0s',
      animationIterationCount: '1',
      animationPlayState: 'paused',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    vi.advanceTimersByTime(133)
    expect(harness.api.phase.value).toBe('exiting')
    vi.advanceTimersByTime(1)
    expect(harness.api.phase.value).toBe('closed')
  })

  it('counts a cancelled motion as settled and keeps waiting for the rest', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity, transform',
      transitionDuration: '100ms, 300ms',
      transitionDelay: '0s',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())

    node.dispatchEvent(
      new TransitionEvent('transitioncancel', { propertyName: 'transform' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('exiting')

    node.dispatchEvent(
      new TransitionEvent('transitioncancel', { propertyName: 'opacity' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('closed')
  })

  it('falls back to the safety deadline when a declared motion never ends', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity, transform',
      transitionDuration: '100ms, 300ms',
      transitionDelay: '0s',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())

    vi.advanceTimersByTime(100)
    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'opacity' }),
    )
    // An undeclared property and an untyped event settle nothing.
    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'color' }),
    )
    node.dispatchEvent(new Event('transitionend'))
    vi.advanceTimersByTime(233)
    expect(harness.api.phase.value).toBe('exiting')
    vi.advanceTimersByTime(1)
    expect(harness.api.phase.value).toBe('closed')
  })

  it('settles a transition-property: all entry on any undeclared property', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'all, opacity',
      transitionDuration: '300ms, 100ms',
      transitionDelay: '0s',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    const node = required(harness.surface())

    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'opacity' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('exiting')

    node.dispatchEvent(
      new TransitionEvent('transitionend', { propertyName: 'translate' }),
    )
    await nextTick()
    expect(harness.api.phase.value).toBe('closed')
  })

  it('a stale fallback timer from an interrupted exit is a no-op', async () => {
    vi.useFakeTimers()
    stubComputedStyle({
      transitionProperty: 'opacity',
      transitionDuration: '100ms',
      transitionDelay: '0s',
    })
    const harness = mountHarness(true)
    await nextTick()
    harness.present.value = false
    await nextTick()
    harness.present.value = true
    await nextTick()
    vi.advanceTimersByTime(500)
    expect(harness.api.phase.value).toBe('open')
    expect(harness.surface()).not.toBeNull()
  })
})

describe('measureComputedExitMotion', () => {
  const none = {
    transitionProperty: 'all',
    transitionDuration: '0s',
    transitionDelay: '0s',
    animationName: 'none',
    animationDuration: '0s',
    animationDelay: '0s',
    animationIterationCount: '1',
    animationPlayState: 'running',
  }

  it('reports zero for absent motion', () => {
    const result = measureComputedExitMotion(none)
    expect(result.totalMs).toBe(0)
    expect(result.transitions.size).toBe(0)
    expect(result.animations.size).toBe(0)
  })

  it('lists each motion with positive time so every one can be awaited', () => {
    const result = measureComputedExitMotion({
      ...none,
      transitionProperty: 'opacity, transform, color, opacity',
      transitionDuration: '100ms, 300ms, 0s, 200ms',
      animationName: 'fade, fade, late',
      animationDuration: '100ms, 200ms, 100ms',
      animationDelay: '0s, 0s, -200ms',
    })
    expect(result.totalMs).toBe(300)
    expect([...result.transitions]).toEqual(['opacity', 'transform'])
    expect([...result.animations]).toEqual([['fade', 2]])
  })

  it('cycles shorter time lists against the property list', () => {
    expect(
      measureComputedExitMotion({
        ...none,
        transitionProperty: 'opacity, translate, scale',
        transitionDuration: '0.1s, 50ms',
        transitionDelay: '0s',
      }).totalMs,
    ).toBe(100)
    expect(
      measureComputedExitMotion({
        ...none,
        transitionProperty: 'opacity, translate, scale',
        transitionDuration: '10ms, 20ms',
        transitionDelay: '0s, 0s, 200ms',
      }).totalMs,
    ).toBe(210)
  })

  it('skips transition-property none and invalid animation entries', () => {
    expect(
      measureComputedExitMotion({
        ...none,
        transitionProperty: 'none',
        transitionDuration: '1s',
        animationName: 'fade, wobble',
        animationDuration: '0s, 100ms',
        animationIterationCount: '2, -1',
      }).totalMs,
    ).toBe(0)
  })

  it('multiplies finite iteration counts and excludes infinite ones', () => {
    const result = measureComputedExitMotion({
      ...none,
      animationName: 'pulse, exit-fade',
      animationDuration: '1s, 100ms',
      animationDelay: '0s, 20ms',
      animationIterationCount: 'INFINITE, 3',
    })
    expect(result.totalMs).toBe(320)
    expect([...result.animations]).toEqual([['exit-fade', 1]])
  })

  it('excludes paused animations, cycling the play-state list', () => {
    const result = measureComputedExitMotion({
      ...none,
      animationName: 'hold, exit-fade, settle',
      animationDuration: '30s, 100ms, 200ms',
      animationDelay: '0s',
      animationIterationCount: '1',
      animationPlayState: 'PAUSED, running',
    })
    // `settle` cycles back to the first play state, so it is paused too.
    expect(result.totalMs).toBe(100)
    expect([...result.animations]).toEqual([['exit-fade', 1]])
  })
})
