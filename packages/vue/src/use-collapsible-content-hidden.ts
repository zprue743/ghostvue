import {
  nextTick,
  onMounted,
  onUnmounted,
  ref,
  toValue,
  watch,
  type MaybeRefOrGetter,
  type Ref,
} from 'vue'

import { resolveCollapsibleHtmlElement } from './ghost-collapsible'

/** Grid row transition driven by themed collapsible CSS. */
export const COLLAPSIBLE_HEIGHT_TRANSITION_PROPERTY = 'grid-template-rows'

/**
 * Fallback when `transitionend` never fires (for example when transitions are
 * disabled in devtools or the element unmounts mid-close).
 */
export const COLLAPSIBLE_CLOSE_FALLBACK_MS = 400

export function isThemedCollapsibleSurface(
  element: HTMLElement | null,
  hasDataThemed: boolean,
): boolean {
  if (hasDataThemed) {
    return true
  }
  if (!element) {
    return false
  }
  return Boolean(element.closest('.ghost-theme, .ghost-themed-scope'))
}

export function collapsibleHeightAnimationEnabled(options: {
  themedSurface: boolean
  disableAnimation: boolean
  dataAnimationOff: boolean
  prefersReducedMotion: boolean
}): boolean {
  return (
    options.themedSurface &&
    !options.disableAnimation &&
    !options.dataAnimationOff &&
    !options.prefersReducedMotion
  )
}

export interface UseCollapsibleContentHiddenOptions {
  isOpen: MaybeRefOrGetter<boolean>
  host: MaybeRefOrGetter<unknown>
  disableAnimation: MaybeRefOrGetter<boolean>
  dataAnimationOff: MaybeRefOrGetter<boolean>
  hasDataThemed: MaybeRefOrGetter<boolean>
}

/**
 * Owns the native `hidden` attribute for disclosure panels. Headless surfaces
 * mirror `isOpen` immediately. Themed surfaces defer `hidden` on close until
 * the height transition finishes so CSS can animate `grid-template-rows`.
 */
export function useCollapsibleContentHidden(
  options: UseCollapsibleContentHiddenOptions,
): Ref<boolean> {
  const panelHidden = ref(!toValue(options.isOpen))
  const prefersReducedMotion = ref(false)

  let closeTimer: ReturnType<typeof setTimeout> | undefined
  let onTransitionEnd: ((event: TransitionEvent) => void) | undefined

  function resolveHostElement(): HTMLElement | null {
    return resolveCollapsibleHtmlElement(toValue(options.host))
  }

  function animationEnabled(): boolean {
    const element = resolveHostElement()
    return collapsibleHeightAnimationEnabled({
      themedSurface: isThemedCollapsibleSurface(
        element,
        toValue(options.hasDataThemed),
      ),
      disableAnimation: toValue(options.disableAnimation),
      dataAnimationOff: toValue(options.dataAnimationOff),
      prefersReducedMotion: prefersReducedMotion.value,
    })
  }

  function clearCloseAnimationListeners(): void {
    if (closeTimer !== undefined) {
      clearTimeout(closeTimer)
      closeTimer = undefined
    }
    const element = resolveHostElement()
    if (onTransitionEnd && element) {
      element.removeEventListener('transitionend', onTransitionEnd)
    }
    onTransitionEnd = undefined
  }

  function finishClose(): void {
    clearCloseAnimationListeners()
    panelHidden.value = true
  }

  function scheduleDeferredClose(): void {
    const element = resolveHostElement()
    if (!element) {
      panelHidden.value = true
      return
    }

    onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== element) {
        return
      }
      if (event.propertyName !== COLLAPSIBLE_HEIGHT_TRANSITION_PROPERTY) {
        return
      }
      finishClose()
    }
    element.addEventListener('transitionend', onTransitionEnd)

    closeTimer = setTimeout(() => {
      finishClose()
    }, COLLAPSIBLE_CLOSE_FALLBACK_MS)
  }

  onMounted(() => {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return
    }
    prefersReducedMotion.value = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
  })

  watch(
    () => toValue(options.isOpen),
    async (open) => {
      clearCloseAnimationListeners()

      if (open) {
        panelHidden.value = false
        return
      }

      if (!animationEnabled()) {
        panelHidden.value = true
        return
      }

      panelHidden.value = false
      await nextTick()
      scheduleDeferredClose()
    },
    { flush: 'post' },
  )

  onUnmounted(() => {
    clearCloseAnimationListeners()
  })

  return panelHidden
}
