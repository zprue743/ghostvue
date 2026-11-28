import {
  computed,
  getCurrentInstance,
  onMounted,
  onScopeDispose,
  shallowRef,
  toValue,
  watch,
} from 'vue'

import type {
  GhostPresencePhase,
  UseGhostPresenceOptions,
  UseGhostPresenceReturn,
} from './ghost-presence'

/**
 * Margin added to the computed-style fallback deadline so a synthetic host
 * that never dispatches `transitionend` still converges shortly after the
 * longest declared exit motion, without cutting a real one short.
 */
const FALLBACK_SAFETY_MARGIN_MS = 34

const EXIT_EVENTS = [
  'transitionend',
  'transitioncancel',
  'animationend',
  'animationcancel',
] as const

/**
 * Resolves a template-ref target to an `HTMLElement`: a raw element, or a
 * component instance exposing `element` (preferred) or `$el`.
 */
export function resolvePresenceElement(target: unknown): HTMLElement | null {
  if (typeof HTMLElement === 'undefined') {
    return null
  }
  if (target instanceof HTMLElement) {
    return target
  }
  if (typeof target === 'object' && target !== null) {
    if ('element' in target && target.element instanceof HTMLElement) {
      return target.element
    }
    if ('$el' in target && target.$el instanceof HTMLElement) {
      return target.$el
    }
  }
  return null
}

function toFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

/**
 * True when `animation` targets `element` itself (never a descendant or a
 * pseudo-element) and still has finite, positive remaining time. Persistent
 * infinite or zero-rate animations are excluded so they never block removal.
 */
function gatesExit(animation: Animation, element: HTMLElement): boolean {
  const effect = animation.effect
  if (!effect || !('target' in effect) || effect.target !== element) {
    return false
  }
  if ('pseudoElement' in effect && effect.pseudoElement) {
    return false
  }
  // A pending play reports `running`; paused or finished animations cannot
  // advance to a settled end state on their own.
  if (animation.playState !== 'running') {
    return false
  }
  const rate = animation.playbackRate
  if (rate === 0) {
    return false
  }

  let remainingMs: number
  if (typeof effect.getComputedTiming === 'function') {
    const timing = effect.getComputedTiming()
    const endTime = toFiniteNumber(timing.endTime)
    if (endTime === null || timing.iterations === Infinity) {
      return false
    }
    const localTime = toFiniteNumber(timing.localTime) ?? 0
    remainingMs = rate > 0 ? endTime - localTime : localTime
  } else {
    // Minimal synthetic mocks expose only the specified timing.
    const timing = effect.getTiming()
    const duration = typeof timing.duration === 'number' ? timing.duration : 0
    const iterations = timing.iterations ?? 1
    if (!Number.isFinite(duration) || !Number.isFinite(iterations)) {
      return false
    }
    remainingMs = (timing.delay ?? 0) + duration * iterations
  }
  return Number.isFinite(remainingMs) && remainingMs > 0
}

function parseCssList(value: string): string[] {
  return value.split(',').map((entry) => entry.trim())
}

function parseCssTime(value: string | undefined): number {
  if (value === undefined) {
    return 0
  }
  const trimmed = value.trim().toLowerCase()
  const amount = Number.parseFloat(trimmed)
  if (!Number.isFinite(amount)) {
    return 0
  }
  if (trimmed.endsWith('ms')) {
    return amount
  }
  if (trimmed.endsWith('s')) {
    return amount * 1000
  }
  return 0
}

function cycled(list: readonly string[], index: number): string | undefined {
  return list.length === 0 ? undefined : list[index % list.length]
}

/**
 * Wildcard key in {@link ComputedExitMotion.transitions} for a
 * `transition-property: all` entry. Every property it animates shares one
 * delay and duration, so the first end event it produces settles the entry.
 */
const ALL_TRANSITION_PROPERTIES = 'all'

/** Exit motion measured from computed styles when `getAnimations` is missing. */
export interface ComputedExitMotion {
  /** Longest included transition or finite animation, in milliseconds. */
  totalMs: number
  /**
   * Transition properties with positive `delay + duration`. A property listed
   * twice runs one transition (the last declaration wins), so this is a set.
   */
  transitions: ReadonlySet<string>
  /**
   * Finite animation names with positive active time, counted per entry:
   * `animation: fade 100ms, fade 200ms` runs two animations that each end.
   * Infinite and paused animations are excluded and never gate removal.
   */
  animations: ReadonlyMap<string, number>
}

type ComputedMotionStyle = Pick<
  CSSStyleDeclaration,
  | 'transitionProperty'
  | 'transitionDuration'
  | 'transitionDelay'
  | 'animationName'
  | 'animationDuration'
  | 'animationDelay'
  | 'animationIterationCount'
  | 'animationPlayState'
>

/**
 * Applies CSS list-matching rules: the property/name list sets the entry
 * count and shorter time lists cycle. Transitions contribute
 * `delay + duration` (a positive delay alone keeps the surface mounted);
 * finite running animations contribute `delay + duration * count`; infinite
 * and paused animations are excluded. Entries with positive time are also returned
 * individually so the event fallback can wait for each of them.
 */
export function measureComputedExitMotion(
  style: ComputedMotionStyle,
): ComputedExitMotion {
  let totalMs = 0
  const transitions = new Set<string>()
  const animations = new Map<string, number>()

  const properties = parseCssList(style.transitionProperty || 'all')
  const transitionDurations = parseCssList(style.transitionDuration || '0s')
  const transitionDelays = parseCssList(style.transitionDelay || '0s')
  properties.forEach((property, index) => {
    if (property === 'none') {
      return
    }
    const entry =
      parseCssTime(cycled(transitionDelays, index)) +
      parseCssTime(cycled(transitionDurations, index))
    if (entry > 0) {
      transitions.add(property.toLowerCase())
    }
    totalMs = Math.max(totalMs, entry)
  })

  const names = parseCssList(style.animationName || 'none')
  const animationDurations = parseCssList(style.animationDuration || '0s')
  const animationDelays = parseCssList(style.animationDelay || '0s')
  const iterationCounts = parseCssList(style.animationIterationCount || '1')
  const playStates = parseCssList(style.animationPlayState || 'running')
  names.forEach((name, index) => {
    if (name === 'none' || name === '') {
      return
    }
    // A paused animation never dispatches `animationend`, so counting it
    // would hold the surface until the safety timer (matching the primary
    // path, which also ignores paused animations).
    if ((cycled(playStates, index) ?? 'running').toLowerCase() === 'paused') {
      return
    }
    const countText = (cycled(iterationCounts, index) ?? '1').toLowerCase()
    if (countText === 'infinite') {
      return
    }
    const count = Number.parseFloat(countText)
    const duration = parseCssTime(cycled(animationDurations, index))
    if (!Number.isFinite(count) || count <= 0 || duration <= 0) {
      return
    }
    const entry =
      parseCssTime(cycled(animationDelays, index)) + duration * count
    if (entry > 0) {
      animations.set(name, (animations.get(name) ?? 0) + 1)
    }
    totalMs = Math.max(totalMs, entry)
  })

  return { totalMs, transitions, animations }
}

/**
 * Decouples logical open state from physical DOM presence for one surface.
 *
 * On a mounted client, `present: true -> false` flips `phase` to `'exiting'`
 * synchronously (before the close render) so the node stays mounted with
 * `data-state="closed"`. After that render flushes, the surface's own finite
 * CSS transitions and animations are awaited; with none, removal happens in
 * the same post-flush tick. Reopening while exiting reuses the same node, and
 * an attempt counter turns every late completion from an older exit into a
 * no-op. Setup touches no browser globals, so SSR output is unchanged.
 */
export function useGhostPresence(
  options: UseGhostPresenceOptions,
): UseGhostPresenceReturn {
  const isPresentInput = (): boolean => toValue(options.present)
  const phase = shallowRef<GhostPresencePhase>(
    isPresentInput() ? 'open' : 'closed',
  )
  const boundElement = shallowRef<HTMLElement | null>(null)

  // Mount gate: a close before mount (or outside a component on the server)
  // goes straight to `'closed'`; there is no rendered surface to animate.
  let isMounted = false
  let isDisposed = false
  let attemptId = 0
  let disposeExit: (() => void) | undefined
  // Bumped on each exit start; a post-flush watcher runs detection after the
  // close render has written `data-state="closed"` to the DOM.
  const exitRequest = shallowRef(0)

  if (getCurrentInstance()) {
    onMounted(() => {
      isMounted = true
    })
  } else {
    isMounted = typeof document !== 'undefined'
  }

  function resolveElement(): HTMLElement | null {
    const explicit =
      options.element === undefined ? undefined : toValue(options.element)
    return explicit ?? boundElement.value
  }

  function isDisabled(): boolean {
    return toValue(options.disabled) ?? false
  }

  function cancelPendingExit(): void {
    attemptId += 1
    disposeExit?.()
    disposeExit = undefined
  }

  function completeExit(id: number): void {
    if (isDisposed || id !== attemptId || phase.value !== 'exiting') {
      return
    }
    disposeExit?.()
    disposeExit = undefined
    phase.value = 'closed'
    options.onExitComplete?.()
  }

  function waitForComputedMotion(element: HTMLElement, id: number): void {
    const motion = measureComputedExitMotion(getComputedStyle(element))
    if (motion.totalMs <= 0) {
      completeExit(id)
      return
    }
    // Every included motion must end (or cancel) before removal, so a short
    // opacity fade never cuts off a longer transform beside it. A declared
    // motion that never starts (its property did not change, or a shorthand
    // reports longhand names) stays outstanding and the safety timer, set
    // past the longest one, completes the exit instead.
    const pendingTransitions = new Set(motion.transitions)
    const pendingAnimations = new Map(motion.animations)
    const onEnd = (event: Event): void => {
      // Bubbled events from descendants (button hovers, spinners) never end
      // the surface's own exit.
      if (event.target !== element) {
        return
      }
      if (event.type.startsWith('transition')) {
        const property =
          'propertyName' in event && typeof event.propertyName === 'string'
            ? event.propertyName.toLowerCase()
            : ''
        if (pendingTransitions.has(property)) {
          pendingTransitions.delete(property)
        } else if (property !== '' && !motion.transitions.has(property)) {
          // An undeclared property can only come from an `all` entry.
          pendingTransitions.delete(ALL_TRANSITION_PROPERTIES)
        }
      } else {
        // Unknown names include infinite and zero-length animations, which
        // never gate removal.
        const name =
          'animationName' in event && typeof event.animationName === 'string'
            ? event.animationName
            : ''
        const remaining = pendingAnimations.get(name)
        if (remaining !== undefined) {
          if (remaining > 1) {
            pendingAnimations.set(name, remaining - 1)
          } else {
            pendingAnimations.delete(name)
          }
        }
      }
      if (pendingTransitions.size === 0 && pendingAnimations.size === 0) {
        completeExit(id)
      }
    }
    for (const type of EXIT_EVENTS) {
      element.addEventListener(type, onEnd)
    }
    const timer = setTimeout(
      () => {
        completeExit(id)
      },
      Math.ceil(motion.totalMs) + FALLBACK_SAFETY_MARGIN_MS,
    )
    disposeExit = () => {
      clearTimeout(timer)
      for (const type of EXIT_EVENTS) {
        element.removeEventListener(type, onEnd)
      }
    }
  }

  function runExitDetection(id: number): void {
    const element = resolveElement()
    if (isDisabled() || !element?.isConnected) {
      completeExit(id)
      return
    }
    if (typeof element.getAnimations !== 'function') {
      waitForComputedMotion(element, id)
      return
    }
    // Without `{ subtree: true }`: only the surface's own motion gates removal.
    const pending = element
      .getAnimations()
      .filter((animation) => gatesExit(animation, element))
    if (pending.length === 0) {
      completeExit(id)
      return
    }
    let cancelled = false
    disposeExit = () => {
      cancelled = true
    }
    // allSettled: a cancelled animation (AbortError, for example an ancestor
    // set to `display: none` or a portal reparent) also ends the exit.
    void Promise.allSettled(
      pending.map((animation) => animation.finished),
    ).then(() => {
      if (!cancelled) {
        completeExit(id)
      }
    })
  }

  // `sync` so the phase flips before Vue re-runs the owner's render effect:
  // `isPresent` stays true across the close render and the node is retained
  // rather than unmounted and remounted.
  watch(
    isPresentInput,
    (present) => {
      cancelPendingExit()
      if (present) {
        phase.value = 'open'
        return
      }
      if (phase.value !== 'open') {
        return
      }
      if (!isMounted || isDisposed || isDisabled()) {
        phase.value = 'closed'
        return
      }
      phase.value = 'exiting'
      exitRequest.value += 1
    },
    { flush: 'sync' },
  )

  watch(
    exitRequest,
    () => {
      if (phase.value === 'exiting') {
        runExitDetection(attemptId)
      }
    },
    { flush: 'post' },
  )

  // Owner unmount aborts silently: no `onExitComplete`, no timers or
  // listeners left behind. Vue's unmount removes the DOM itself.
  onScopeDispose(() => {
    isDisposed = true
    cancelPendingExit()
  })

  return {
    isPresent: computed(() => isPresentInput() || phase.value === 'exiting'),
    phase,
    dataState: computed(() => (phase.value === 'open' ? 'open' : 'closed')),
    isExiting: computed(() => phase.value === 'exiting'),
    setElement(target: unknown) {
      boundElement.value = resolvePresenceElement(target)
    },
  }
}
