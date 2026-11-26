import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  toValue,
  type ComputedRef,
  type Ref,
} from 'vue'

import { logGhostCode } from './dev-codes'
import {
  normalizeScrollSpyTargetId,
  type GhostScrollSpyActivateDetail,
  type GhostScrollSpyContainer,
  type GhostScrollSpyHistoryMode,
  type GhostScrollSpyOrientation,
  type GhostScrollSpyTravelDirection,
  type ScrollSpyRegistryEntry,
  type UseGhostScrollSpyOptions,
} from './ghost-scroll-spy'
import {
  isScrollSpyScrollable,
  resolveScrollSpyActiveIndex,
  resolveScrollSpyProgress,
  resolveScrollSpySegmentProgress,
  resolveScrollSpyTravelDirection,
  SCROLL_SPY_DEFAULT_END_THRESHOLD,
  SCROLL_SPY_DEFAULT_PROBE_OFFSET,
} from './scroll-spy-motion'
import { useControllableState } from './use-controllable-state'

export interface UseGhostScrollSpyReturn {
  readonly modelValue: ComputedRef<string | undefined>
  readonly activeId: ComputedRef<string | undefined>
  readonly travelDirection: Ref<GhostScrollSpyTravelDirection | undefined>
  readonly itemCount: ComputedRef<number>
  readonly orientation: ComputedRef<GhostScrollSpyOrientation>
  registerItem(
    id: symbol,
    target: string,
    disabled: boolean,
    getLinkElement: () => HTMLElement | null,
  ): void
  unregisterItem(id: symbol): void
  setItemDisabled(id: symbol, disabled: boolean): void
  isActive(target: string): boolean
  scrollTo(
    targetId: string,
    options?: { behavior?: ScrollBehavior; focus?: boolean },
  ): void
  measure(): void
  attachRoot(element: HTMLElement | null): void
  handleActivate(detail: GhostScrollSpyActivateDetail): void
}

function sortRegistryEntries(
  entries: readonly ScrollSpyRegistryEntry[],
): ScrollSpyRegistryEntry[] {
  const connected = new Map<symbol, Element>()
  for (const entry of entries) {
    const element = entry.getLinkElement()
    if (element?.isConnected) {
      connected.set(entry.id, element)
    }
  }
  return [...entries].sort((left, right) => {
    const elementA = connected.get(left.id)
    const elementB = connected.get(right.id)
    if (!elementA || !elementB) {
      if (elementA) return -1
      return elementB ? 1 : 0
    }
    if (elementA === elementB) return 0
    const position = elementA.compareDocumentPosition(elementB)
    if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1
    if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1
    return 0
  })
}

function firstRegisteredTarget(
  entries: readonly ScrollSpyRegistryEntry[],
): string | undefined {
  const ordered = sortRegistryEntries(entries)
  const first = ordered.find((entry) => !entry.disabled)
  return first?.target
}

function resolveScrollContainer(
  container: GhostScrollSpyContainer,
): Window | HTMLElement | null {
  if (typeof window === 'undefined') {
    return null
  }
  if (container === undefined || container === null) {
    return window
  }
  if (container instanceof Window) {
    return container
  }
  return container
}

function readScrollMetrics(container: Window | HTMLElement): {
  scrollTop: number
  scrollHeight: number
  viewportHeight: number
} {
  if (container instanceof Window) {
    return {
      scrollTop: container.scrollY,
      scrollHeight: document.documentElement.scrollHeight,
      viewportHeight: container.innerHeight,
    }
  }
  return {
    scrollTop: container.scrollTop,
    scrollHeight: container.scrollHeight,
    viewportHeight: container.clientHeight,
  }
}

function readTargetTop(
  container: Window | HTMLElement,
  element: HTMLElement,
): number {
  const targetRect = element.getBoundingClientRect()
  if (container instanceof Window) {
    return targetRect.top
  }
  return targetRect.top - container.getBoundingClientRect().top
}

function scrollTargetIntoContainer(
  container: Window | HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior,
): void {
  if (container instanceof Window) {
    element.scrollIntoView({ behavior, block: 'start' })
    return
  }
  const containerRect = container.getBoundingClientRect()
  const targetRect = element.getBoundingClientRect()
  const nextTop = targetRect.top - containerRect.top + container.scrollTop
  container.scrollTo({ top: nextTop, behavior })
}

function updateScrollSpyHash(
  targetId: string,
  mode: GhostScrollSpyHistoryMode,
): void {
  if (mode === 'none' || typeof window === 'undefined') {
    return
  }
  const url = `${window.location.pathname}${window.location.search}#${targetId}`
  if (mode === 'push') {
    window.history.pushState(window.history.state, '', url)
    return
  }
  window.history.replaceState(window.history.state, '', url)
}

function focusScrollSpyTarget(element: HTMLElement): void {
  if (element.tabIndex < 0 && !element.hasAttribute('tabindex')) {
    element.setAttribute('tabindex', '-1')
  }
  element.focus({ preventScroll: true })
}

/**
 * Headless scroll-spy coordinator: target registration, passive scroll
 * measurement, CSS progress custom properties, and programmatic navigation.
 */
export function useGhostScrollSpy(
  options: UseGhostScrollSpyOptions = {},
): UseGhostScrollSpyReturn {
  const registry = shallowRef<ScrollSpyRegistryEntry[]>([])
  const warnedDuplicateTargets = new Set<string>()
  const rootElement = shallowRef<HTMLElement | null>(null)
  const travelDirection = shallowRef<GhostScrollSpyTravelDirection | undefined>(
    undefined,
  )

  let frame = 0
  let travelTimer: ReturnType<typeof setTimeout> | undefined
  let lastScrollTop = 0
  let restoredInitialScroll = false
  let resizeObserver: ResizeObserver | undefined
  let reducedMotionQuery: MediaQueryList | undefined
  let scrollContainer: Window | HTMLElement | null = null

  const hasExplicitDefault = computed(
    () => toValue(options.defaultValue) !== undefined,
  )

  const modelValue = useControllableState<string | undefined>({
    prop: () => toValue(options.modelValue),
    defaultValue: () => toValue(options.defaultValue),
    allowControlledUndefined: true,
    onChange: (next) => {
      options.onValueChange?.(next)
    },
  })

  const orientation = computed<GhostScrollSpyOrientation>(
    () => toValue(options.orientation) ?? 'vertical',
  )

  const probeOffset = computed(
    () => toValue(options.probeOffset) ?? SCROLL_SPY_DEFAULT_PROBE_OFFSET,
  )

  const endThreshold = computed(
    () => toValue(options.endThreshold) ?? SCROLL_SPY_DEFAULT_END_THRESHOLD,
  )

  const scrollBehavior = computed(
    () => toValue(options.scrollBehavior) ?? 'smooth',
  )

  const historyMode = computed(() => toValue(options.historyMode) ?? 'replace')

  const focusTarget = computed(() => toValue(options.focusTarget) ?? true)

  const travelSettleMs = computed(() => toValue(options.travelSettleMs) ?? 180)

  const defaultUncontrolled = computed(
    () =>
      toValue(options.modelValue) === undefined && !hasExplicitDefault.value,
  )

  const itemCount = computed(
    () => registry.value.filter((entry) => !entry.disabled).length,
  )

  const activeId = computed(() => modelValue.value)

  function ensureInitialSelection(target: string): void {
    if (!defaultUncontrolled.value) {
      return
    }
    modelValue.value ??= target
  }

  function bumpRegistry(): void {
    registry.value = [...registry.value]
  }

  function registerItem(
    id: symbol,
    rawTarget: string,
    disabled: boolean,
    getLinkElement: () => HTMLElement | null,
  ): void {
    const target = normalizeScrollSpyTargetId(rawTarget)
    const duplicate = registry.value.some(
      (entry) => entry.target === target && entry.id !== id,
    )
    if (
      duplicate &&
      process.env.NODE_ENV !== 'production' &&
      !warnedDuplicateTargets.has(target)
    ) {
      warnedDuplicateTargets.add(target)
      logGhostCode('GHOST013', { target })
    }

    const next = registry.value.filter((entry) => entry.id !== id)
    next.push({ id, target, disabled, getLinkElement })
    registry.value = next
    ensureInitialSelection(target)
    scheduleMeasure()
  }

  function unregisterItem(id: symbol): void {
    const before = registry.value.length
    registry.value = registry.value.filter((entry) => entry.id !== id)
    if (registry.value.length !== before) {
      bumpRegistry()
      if (
        defaultUncontrolled.value &&
        modelValue.value !== undefined &&
        !registry.value.some((entry) => entry.target === modelValue.value)
      ) {
        modelValue.value = firstRegisteredTarget(registry.value)
      }
      scheduleMeasure()
    }
  }

  function setItemDisabled(id: symbol, disabled: boolean): void {
    const entry = registry.value.find((item) => item.id === id)
    if (!entry || entry.disabled === disabled) {
      return
    }
    entry.disabled = disabled
    bumpRegistry()
    scheduleMeasure()
  }

  function isActive(target: string): boolean {
    const normalized = normalizeScrollSpyTargetId(target)
    return activeId.value === normalized
  }

  function resolveEffectiveBehavior(
    behavior: ScrollBehavior | undefined,
  ): ScrollBehavior {
    const preferred = behavior ?? scrollBehavior.value
    if (reducedMotionQuery?.matches) {
      return 'auto'
    }
    return preferred
  }

  function scrollTo(
    rawTargetId: string,
    activationOptions: { behavior?: ScrollBehavior; focus?: boolean } = {},
  ): void {
    if (typeof document === 'undefined') {
      return
    }
    const targetId = normalizeScrollSpyTargetId(rawTargetId)
    const element = document.getElementById(targetId)
    const container = resolveScrollContainer(toValue(options.container))
    if (!element || !container) {
      return
    }
    scrollTargetIntoContainer(
      container,
      element,
      resolveEffectiveBehavior(activationOptions.behavior),
    )
    if (!Object.is(modelValue.value, targetId)) {
      modelValue.value = targetId
    }
    if (activationOptions.focus ?? false) {
      focusScrollSpyTarget(element)
    }
  }

  function handleActivate(detail: GhostScrollSpyActivateDetail): void {
    options.onActivate?.(detail)
    if (detail.event.defaultPrevented) {
      return
    }

    const targetId = normalizeScrollSpyTargetId(detail.id)
    const element = detail.element
    const container = resolveScrollContainer(toValue(options.container))
    if (!element || !container) {
      return
    }

    detail.event.preventDefault()

    scrollTargetIntoContainer(
      container,
      element,
      resolveEffectiveBehavior(undefined),
    )
    updateScrollSpyHash(targetId, historyMode.value)
    if (focusTarget.value) {
      focusScrollSpyTarget(element)
    }
    if (!Object.is(modelValue.value, targetId)) {
      modelValue.value = targetId
    }
  }

  function trackTravel(nextScrollTop: number): void {
    const root = rootElement.value
    if (!root || !restoredInitialScroll) {
      lastScrollTop = nextScrollTop
      return
    }
    const direction = resolveScrollSpyTravelDirection(
      lastScrollTop,
      nextScrollTop,
    )
    lastScrollTop = nextScrollTop
    if (!direction) {
      return
    }
    travelDirection.value = direction
    root.setAttribute('data-travel', direction)
    clearTimeout(travelTimer)
    travelTimer = setTimeout(() => {
      root.removeAttribute('data-travel')
      travelDirection.value = undefined
    }, travelSettleMs.value)
  }

  function measure(): void {
    frame = 0
    const root = rootElement.value
    const container = scrollContainer
    if (!root || !container || typeof document === 'undefined') {
      return
    }

    const { scrollTop, scrollHeight, viewportHeight } =
      readScrollMetrics(container)
    trackTravel(scrollTop)

    const enabled = sortRegistryEntries(registry.value).filter(
      (entry) => !entry.disabled,
    )
    const measured = enabled
      .map((entry) => {
        const element = document.getElementById(entry.target)
        if (!element) {
          return null
        }
        return {
          target: entry.target,
          top: readTargetTop(container, element),
        }
      })
      .filter(
        (entry): entry is { target: string; top: number } => entry !== null,
      )

    const tops = measured.map((entry) => entry.top)
    const scrollable = isScrollSpyScrollable(scrollHeight, viewportHeight)
    const progress = resolveScrollSpyProgress(
      scrollTop,
      scrollHeight,
      viewportHeight,
    )

    const segmentProgress = scrollable
      ? resolveScrollSpySegmentProgress(
          tops,
          viewportHeight,
          scrollTop,
          progress,
          probeOffset.value,
        )
      : 0

    root.style.setProperty(
      '--ghost-scroll-spy-progress',
      (scrollable ? progress : 0).toFixed(4),
    )
    root.style.setProperty(
      '--ghost-scroll-spy-section-progress',
      segmentProgress.toFixed(4),
    )

    let nextActive: string | undefined
    if (measured.length === 0) {
      nextActive = undefined
    } else if (!scrollable) {
      nextActive = measured[0]?.target
    } else {
      const index = resolveScrollSpyActiveIndex(
        tops,
        viewportHeight,
        progress,
        probeOffset.value,
        endThreshold.value,
      )
      nextActive = measured[index]?.target
    }

    if (!Object.is(modelValue.value, nextActive)) {
      modelValue.value = nextActive
    }
  }

  function scheduleMeasure(): void {
    if (frame !== 0 || typeof window === 'undefined') {
      return
    }
    frame = window.requestAnimationFrame(measure)
  }

  function attachRoot(element: HTMLElement | null): void {
    rootElement.value = element
    if (element) {
      element.style.setProperty('--ghost-scroll-spy-progress', '0')
      element.style.setProperty('--ghost-scroll-spy-section-progress', '0')
    }
    scheduleMeasure()
  }

  function onScroll(): void {
    scheduleMeasure()
  }

  function mountClient(): void {
    scrollContainer = resolveScrollContainer(toValue(options.container))
    if (!scrollContainer) {
      return
    }

    if (typeof window.matchMedia === 'function') {
      reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    }

    lastScrollTop = readScrollMetrics(scrollContainer).scrollTop
    restoredInitialScroll = false

    scrollContainer.addEventListener('scroll', onScroll, { passive: true })

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        scheduleMeasure()
      })
      if (scrollContainer instanceof Window) {
        resizeObserver.observe(document.documentElement)
        resizeObserver.observe(document.body)
      } else {
        resizeObserver.observe(scrollContainer)
      }
    }

    scheduleMeasure()
    window.requestAnimationFrame(() => {
      restoredInitialScroll = true
    })
  }

  function unmountClient(): void {
    clearTimeout(travelTimer)
    if (frame !== 0 && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frame)
      frame = 0
    }
    scrollContainer?.removeEventListener('scroll', onScroll)
    resizeObserver?.disconnect()
    resizeObserver = undefined
    reducedMotionQuery = undefined
    scrollContainer = null
    travelDirection.value = undefined
  }

  onMounted(mountClient)
  onBeforeUnmount(unmountClient)

  return {
    modelValue,
    activeId,
    travelDirection,
    itemCount,
    orientation,
    registerItem,
    unregisterItem,
    setItemDisabled,
    isActive,
    scrollTo,
    measure,
    attachRoot,
    handleActivate,
  }
}
