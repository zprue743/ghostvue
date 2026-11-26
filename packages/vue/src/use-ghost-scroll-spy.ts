import {
  computed,
  onBeforeUnmount,
  onMounted,
  shallowRef,
  toValue,
  watch,
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
  isActive(target: string, registrationId?: symbol): boolean
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

function isWindowContainer(
  container: Window | HTMLElement,
): container is Window {
  return container === window || container instanceof Window
}

function resolveScrollContainer(
  container: GhostScrollSpyContainer,
): Window | HTMLElement | null {
  if (typeof window === 'undefined') {
    return null
  }
  return container ?? window
}

function readScrollMetrics(container: Window | HTMLElement): {
  scrollTop: number
  scrollHeight: number
  viewportHeight: number
} {
  if (isWindowContainer(container)) {
    return {
      scrollTop: container.scrollY,
      scrollHeight: container.document.documentElement.scrollHeight,
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
  if (isWindowContainer(container)) {
    return targetRect.top
  }
  return (
    targetRect.top - container.getBoundingClientRect().top - container.clientTop
  )
}

function scrollTargetIntoContainer(
  container: Window | HTMLElement,
  element: HTMLElement,
  behavior: ScrollBehavior,
): void {
  if (isWindowContainer(container)) {
    element.scrollIntoView({ behavior, block: 'start' })
    return
  }
  // Match start alignment within this scrollport while keeping ancestors still.
  const padding = window.getComputedStyle(container).scrollPaddingTop
  const paddingValue = Number.parseFloat(padding) || 0
  const paddingTop = padding.endsWith('%')
    ? (paddingValue / 100) * container.clientHeight
    : paddingValue
  const marginTop =
    Number.parseFloat(window.getComputedStyle(element).scrollMarginTop) || 0
  const top =
    readTargetTop(container, element) +
    container.scrollTop -
    paddingTop -
    marginTop
  container.scrollTo({ top, behavior })
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
  let lastScrollTop: number | undefined
  let resizeObserver: ResizeObserver | undefined
  let observedElements = new Set<Element>()
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

  const enabledEntries = computed(() => {
    const byTarget = new Map<string, ScrollSpyRegistryEntry>()
    for (const entry of registry.value) {
      if (!entry.disabled && !byTarget.has(entry.target)) {
        byTarget.set(entry.target, entry)
      }
    }
    return byTarget
  })
  const itemCount = computed(() => enabledEntries.value.size)

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

    const next = [...registry.value]
    const index = next.findIndex((entry) => entry.id === id)
    next[index === -1 ? next.length : index] = {
      id,
      target,
      disabled,
      getLinkElement,
    }
    registry.value = next
    if (!disabled) {
      ensureInitialSelection(target)
    }
    scheduleMeasure()
  }

  function unregisterItem(id: symbol): void {
    const before = registry.value.length
    registry.value = registry.value.filter((entry) => entry.id !== id)
    if (registry.value.length !== before) {
      if (
        defaultUncontrolled.value &&
        modelValue.value !== undefined &&
        !enabledEntries.value.has(modelValue.value)
      ) {
        modelValue.value = sortRegistryEntries(registry.value).find(
          (entry) => !entry.disabled,
        )?.target
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

  function isActive(target: string, registrationId?: symbol): boolean {
    const normalized = normalizeScrollSpyTargetId(target)
    return (
      activeId.value === normalized &&
      (registrationId === undefined ||
        enabledEntries.value.get(normalized)?.id === registrationId)
    )
  }

  function resolveEffectiveBehavior(
    behavior: ScrollBehavior | undefined,
  ): ScrollBehavior {
    if (reducedMotionQuery?.matches) {
      // 'auto' follows CSS scroll-behavior, which may still request smooth motion.
      return 'instant'
    }
    return behavior ?? scrollBehavior.value
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
    const previousScrollTop = lastScrollTop
    lastScrollTop = nextScrollTop
    if (!root || previousScrollTop === undefined) {
      return
    }
    const direction = resolveScrollSpyTravelDirection(
      previousScrollTop,
      nextScrollTop,
    )
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

    // Keyed moves do not re-register links. Refresh duplicate ownership and
    // measurement order together, only publishing a registry change on a move.
    const ordered = sortRegistryEntries(registry.value)
    if (ordered.some((entry, index) => entry !== registry.value[index])) {
      registry.value = ordered
    }
    const measured = Array.from(enabledEntries.value.keys()).flatMap(
      (target) => {
        const element = document.getElementById(target)
        return element
          ? [{ target, element, top: readTargetTop(container, element) }]
          : []
      },
    )
    if (resizeObserver) {
      syncResizeObserver(
        container,
        measured.map((entry) => entry.element),
      )
    }

    const tops = measured.map((entry) => entry.top)
    const scrollable =
      measured.length > 0 && isScrollSpyScrollable(scrollHeight, viewportHeight)
    const progress = scrollable
      ? resolveScrollSpyProgress(scrollTop, scrollHeight, viewportHeight)
      : 0

    const segmentProgress = scrollable
      ? resolveScrollSpySegmentProgress(
          tops,
          viewportHeight,
          scrollTop,
          progress,
          probeOffset.value,
          endThreshold.value,
        )
      : 0

    root.style.setProperty('--ghost-scroll-spy-progress', progress.toFixed(4))
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

  function syncResizeObserver(
    container: Window | HTMLElement,
    targets: HTMLElement[],
  ): void {
    const observer = resizeObserver
    if (!observer) return

    const next = new Set<Element>(targets)
    if (isWindowContainer(container)) {
      next.add(container.document.documentElement)
      next.add(container.document.body)
    } else {
      next.add(container)
      // A fixed-size scrollport can stay unchanged as its content grows.
      for (const child of container.children) next.add(child)
    }
    for (const element of observedElements) {
      if (!next.has(element)) observer.unobserve(element)
    }
    for (const element of next) {
      if (!observedElements.has(element)) observer.observe(element)
    }
    observedElements = next
  }

  function scheduleMeasure(): void {
    if (frame !== 0 || !scrollContainer) {
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

  watch(
    rootElement,
    (root, _previous, onCleanup) => {
      if (!root || typeof MutationObserver !== 'function') return

      // Keyed moves can change link order without changing any observed box.
      const observer = new MutationObserver(scheduleMeasure)
      observer.observe(root, { childList: true, subtree: true })
      onCleanup(() => {
        observer.disconnect()
      })
    },
    { flush: 'post' },
  )

  function mountClient(): void {
    if (typeof window.matchMedia === 'function') {
      reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    }

    window.addEventListener('resize', scheduleMeasure)

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(scheduleMeasure)
    }

    watch(
      () => resolveScrollContainer(toValue(options.container)),
      (container, _previous, onCleanup) => {
        if (!container) return
        scrollContainer = container
        // The first measurement in this scrollport establishes its own position.
        lastScrollTop = undefined
        clearTimeout(travelTimer)
        rootElement.value?.removeAttribute('data-travel')
        travelDirection.value = undefined

        container.addEventListener('scroll', scheduleMeasure, { passive: true })
        onCleanup(() => {
          container.removeEventListener('scroll', scheduleMeasure)
        })
        scheduleMeasure()
      },
      { immediate: true, flush: 'post' },
    )
  }

  function unmountClient(): void {
    clearTimeout(travelTimer)
    if (frame !== 0 && typeof window !== 'undefined') {
      window.cancelAnimationFrame(frame)
      frame = 0
    }
    window.removeEventListener('resize', scheduleMeasure)
    resizeObserver?.disconnect()
    observedElements.clear()
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
