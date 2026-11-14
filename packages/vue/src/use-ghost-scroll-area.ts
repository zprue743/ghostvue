import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
  toValue,
  watch,
  type ComputedRef,
  type Ref,
} from 'vue'

import type {
  GhostScrollAreaElement,
  GhostScrollAreaOrientation,
  GhostScrollAreaOverflowState,
  GhostScrollAreaOverflowType,
  UseGhostScrollAreaOptions,
} from './ghost-scroll-area'
import { hasTabbableDescendants } from './has-tabbable-descendants'
import { measureScrollOverflow } from './measure-scroll-overflow'

const LINE_SCROLL_DELTA = 40

export interface GhostScrollAreaRootProps {
  class: 'ghost-scroll-area'
  'data-part': 'root'
  'data-orientation': GhostScrollAreaOrientation
  'data-overflow': GhostScrollAreaOverflowState
  style: Record<string, string>
  tabindex?: 0
  'aria-label'?: string
}

function overflowStyles(
  orientation: GhostScrollAreaOrientation,
  type: GhostScrollAreaOverflowType,
): Record<string, string> {
  const value = type === 'scroll' ? 'scroll' : 'auto'

  switch (orientation) {
    case 'horizontal':
      return { overflowX: value, overflowY: 'hidden' }
    case 'both':
      return { overflowX: value, overflowY: value }
    case 'vertical':
    default:
      return { overflowX: 'hidden', overflowY: value }
  }
}

function axisAllowsVertical(orientation: GhostScrollAreaOrientation): boolean {
  return orientation === 'vertical' || orientation === 'both'
}

function axisAllowsHorizontal(
  orientation: GhostScrollAreaOrientation,
): boolean {
  return orientation === 'horizontal' || orientation === 'both'
}

function prefersReducedMotion(): boolean {
  return (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

/**
 * Native overflow container: measures overflow, applies tabindex for axe, and
 * handles arrow/page keys when the root is focused.
 */
export function useGhostScrollArea(
  options: UseGhostScrollAreaOptions,
  element: Ref<HTMLElement | null>,
): {
  as: ComputedRef<GhostScrollAreaElement>
  overflow: Ref<GhostScrollAreaOverflowState>
  onKeyDown: (event: KeyboardEvent) => void
  rootProps: ComputedRef<GhostScrollAreaRootProps>
  scheduleOverflowMeasure: () => void
} {
  const overflow = ref<GhostScrollAreaOverflowState>('none')
  const tabStop = ref(false)

  const as = computed(
    (): GhostScrollAreaElement => toValue(options.as) ?? 'div',
  )
  const orientation = computed(
    (): GhostScrollAreaOrientation =>
      toValue(options.orientation) ?? 'vertical',
  )
  const type = computed(
    (): GhostScrollAreaOverflowType => toValue(options.type) ?? 'auto',
  )
  const label = computed(() => toValue(options.label))

  const rootProps = computed((): GhostScrollAreaRootProps => {
    const base: GhostScrollAreaRootProps = {
      class: 'ghost-scroll-area',
      'data-part': 'root',
      'data-orientation': orientation.value,
      'data-overflow': overflow.value,
      style: overflowStyles(orientation.value, type.value),
    }

    if (tabStop.value) {
      base.tabindex = 0
      const name = label.value?.trim()
      if (name) {
        base['aria-label'] = name
      }
    }

    return base
  })

  let frame = 0
  let resizeObserver: ResizeObserver | undefined
  let mutationObserver: MutationObserver | undefined

  function measureNow(): void {
    const el = element.value
    if (!el) {
      overflow.value = 'none'
      tabStop.value = false
      return
    }

    const nextOverflow = measureScrollOverflow(el, orientation.value)
    overflow.value = nextOverflow
    tabStop.value = nextOverflow !== 'none' && !hasTabbableDescendants(el)
  }

  function scheduleOverflowMeasure(): void {
    if (typeof window === 'undefined') {
      return
    }
    cancelAnimationFrame(frame)
    frame = requestAnimationFrame(() => {
      measureNow()
    })
  }

  function scrollWithKeys(event: KeyboardEvent): void {
    const el = element.value
    if (!el || !tabStop.value || event.defaultPrevented) {
      return
    }

    const behavior: ScrollBehavior = prefersReducedMotion() ? 'auto' : 'auto'
    const orient = orientation.value
    let handled = false

    switch (event.key) {
      case 'ArrowDown':
        if (axisAllowsVertical(orient) && overflow.value !== 'horizontal') {
          el.scrollBy({ top: LINE_SCROLL_DELTA, behavior })
          handled = true
        }
        break
      case 'ArrowUp':
        if (axisAllowsVertical(orient) && overflow.value !== 'horizontal') {
          el.scrollBy({ top: -LINE_SCROLL_DELTA, behavior })
          handled = true
        }
        break
      case 'ArrowRight':
        if (axisAllowsHorizontal(orient) && overflow.value !== 'vertical') {
          el.scrollBy({ left: LINE_SCROLL_DELTA, behavior })
          handled = true
        }
        break
      case 'ArrowLeft':
        if (axisAllowsHorizontal(orient) && overflow.value !== 'vertical') {
          el.scrollBy({ left: -LINE_SCROLL_DELTA, behavior })
          handled = true
        }
        break
      case 'PageDown':
        if (axisAllowsVertical(orient) && overflow.value !== 'horizontal') {
          el.scrollBy({ top: el.clientHeight, behavior })
          handled = true
        }
        break
      case 'PageUp':
        if (axisAllowsVertical(orient) && overflow.value !== 'horizontal') {
          el.scrollBy({ top: -el.clientHeight, behavior })
          handled = true
        }
        break
      case 'Home':
        if (axisAllowsVertical(orient) && overflow.value !== 'horizontal') {
          el.scrollTo({ top: 0, behavior })
          handled = true
        }
        break
      case 'End':
        if (axisAllowsVertical(orient) && overflow.value !== 'horizontal') {
          el.scrollTo({ top: el.scrollHeight, behavior })
          handled = true
        }
        break
      case ' ':
        event.preventDefault()
        return
      default:
        break
    }

    if (handled) {
      event.preventDefault()
    }
  }

  function onKeyDown(event: KeyboardEvent): void {
    scrollWithKeys(event)
  }

  onMounted(() => {
    scheduleOverflowMeasure()

    const el = element.value
    if (!el || typeof window === 'undefined') {
      return
    }

    if (typeof ResizeObserver === 'function') {
      resizeObserver = new ResizeObserver(() => {
        scheduleOverflowMeasure()
      })
      resizeObserver.observe(el)
      for (const child of el.children) {
        if (child instanceof HTMLElement) {
          resizeObserver.observe(child)
        }
      }
    }

    if (typeof MutationObserver === 'function') {
      mutationObserver = new MutationObserver(() => {
        scheduleOverflowMeasure()
      })
      mutationObserver.observe(el, {
        attributes: true,
        childList: true,
        subtree: true,
      })
    }
  })

  onBeforeUnmount(() => {
    cancelAnimationFrame(frame)
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
  })

  watch([orientation, type, label], () => {
    scheduleOverflowMeasure()
  })

  return {
    as,
    overflow,
    onKeyDown,
    rootProps,
    scheduleOverflowMeasure,
  }
}
