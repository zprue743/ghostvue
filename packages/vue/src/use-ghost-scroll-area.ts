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

export interface GhostScrollAreaRootProps {
  class: 'ghost-scroll-area'
  'data-part': 'root'
  'data-orientation': GhostScrollAreaOrientation
  'data-overflow': GhostScrollAreaOverflowState
  'data-type': GhostScrollAreaOverflowType
  style: Record<string, string>
  tabindex?: 0
  role?: 'region'
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

function observeElementResize(target: ResizeObserver, node: Node): void {
  if (node instanceof HTMLElement) {
    target.observe(node)
  }
}

function unobserveElementResize(target: ResizeObserver, node: Node): void {
  if (node instanceof HTMLElement) {
    target.unobserve(node)
  }
}

/**
 * Native overflow container: measures overflow and applies tabindex for axe.
 * Keyboard scrolling is left to the platform on the focused scroll root.
 */
export function useGhostScrollArea(
  options: UseGhostScrollAreaOptions,
  element: Ref<HTMLElement | null>,
): {
  as: ComputedRef<GhostScrollAreaElement>
  overflow: Ref<GhostScrollAreaOverflowState>
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
      'data-type': type.value,
      style: overflowStyles(orientation.value, type.value),
    }

    if (tabStop.value) {
      base.tabindex = 0
      const name = label.value?.trim()
      if (name) {
        base.role = 'region'
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

  function syncResizeObservation(root: HTMLElement): void {
    if (!resizeObserver) {
      return
    }
    resizeObserver.observe(root)
    for (const child of root.children) {
      observeElementResize(resizeObserver, child)
    }
  }

  function handleChildListMutation(record: MutationRecord): void {
    if (!resizeObserver) {
      return
    }
    for (const node of record.removedNodes) {
      unobserveElementResize(resizeObserver, node)
    }
    for (const node of record.addedNodes) {
      observeElementResize(resizeObserver, node)
    }
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
      syncResizeObservation(el)
    }

    if (typeof MutationObserver === 'function') {
      mutationObserver = new MutationObserver((records) => {
        for (const record of records) {
          if (record.type === 'childList') {
            handleChildListMutation(record)
          }
        }
        scheduleOverflowMeasure()
      })
      mutationObserver.observe(el, {
        characterData: true,
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
    rootProps,
    scheduleOverflowMeasure,
  }
}
