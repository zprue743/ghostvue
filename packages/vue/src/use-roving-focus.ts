import {
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import {
  getFocusableElements,
  isDisabledElement,
} from './get-tabbable-elements'

export type RovingOrientation = 'horizontal' | 'vertical' | 'both'
export type TextDirection = 'ltr' | 'rtl'

export interface UseRovingFocusOptions {
  /** Arrow keys that move the tab stop. Default `horizontal`. */
  orientation?: MaybeRefOrGetter<RovingOrientation>
  /** Wrap from last to first (and the reverse). Default true. */
  loop?: MaybeRefOrGetter<boolean>
  /** Explicit text direction. When omitted, read from the container or document. */
  dir?: MaybeRefOrGetter<TextDirection>
  /** Fires whenever the roving tab stop moves among items. */
  onTabStopChange?: (current: HTMLElement | undefined) => void
}

const ROVING_OBSERVER_ATTRIBUTES = [
  'disabled',
  'aria-disabled',
  'hidden',
  'inert',
  'aria-hidden',
  'style',
]

/**
 * APG roving tabindex: one tab stop, arrows/Home/End move among enabled items.
 * Horizontal arrows flip in RTL. Disabled and aria-disabled items are skipped.
 *
 * Listeners attach in `onMounted` so SSR setup does not touch the document.
 */
export function useRovingFocus(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseRovingFocusOptions,
): void {
  let stopWatch: (() => void) | undefined

  onMounted(() => {
    stopWatch = watch(
      () => toValue(container),
      (element, _previous, onCleanup) => {
        if (!element) {
          return
        }

        let currentStop: HTMLElement | undefined

        const sync = (preferred?: HTMLElement): void => {
          const items = getItems(element)
          const enabled = enabledItems(items)
          const nextStop =
            preferred && items.includes(preferred)
              ? preferred
              : currentStop && enabled.includes(currentStop)
                ? currentStop
                : (enabled.find((item) => item.tabIndex >= 0) ?? enabled[0])
          currentStop =
            nextStop && enabled.includes(nextStop) ? nextStop : undefined
          applyTabStops(items, nextStop, options)
        }

        sync()

        const observer = new MutationObserver(() => {
          sync()
        })
        observer.observe(element, {
          childList: true,
          subtree: true,
          attributes: true,
          attributeFilter: ROVING_OBSERVER_ATTRIBUTES,
        })

        const onKeyDown = (event: KeyboardEvent): void => {
          const movedTo = handleRovingKey(event, element, options)
          if (movedTo) {
            currentStop = movedTo
          }
        }
        const onFocusIn = (event: FocusEvent): void => {
          const target = event.target
          if (!(target instanceof HTMLElement) || !element.contains(target)) {
            return
          }
          const items = getItems(element)
          if (items.includes(target)) {
            sync(target)
          }
        }

        element.addEventListener('keydown', onKeyDown)
        element.addEventListener('focusin', onFocusIn)
        onCleanup(() => {
          observer.disconnect()
          element.removeEventListener('keydown', onKeyDown)
          element.removeEventListener('focusin', onFocusIn)
        })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
  })
}

function getItems(root: HTMLElement): HTMLElement[] {
  return getFocusableElements(root).filter((element) => element !== root)
}

function enabledItems(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => !isDisabledElement(item))
}

function applyTabStops(
  items: HTMLElement[],
  current: HTMLElement | undefined,
  options: UseRovingFocusOptions | undefined,
): void {
  for (const item of items) {
    const nextTabIndex = item === current ? 0 : -1
    if (item.tabIndex !== nextTabIndex) {
      item.tabIndex = nextTabIndex
    }
  }
  options?.onTabStopChange?.(current)
}

function handleRovingKey(
  event: KeyboardEvent,
  root: HTMLElement,
  options: UseRovingFocusOptions | undefined,
): HTMLElement | undefined {
  if (event.defaultPrevented || isEditableTarget(event.target)) {
    return undefined
  }

  const items = getItems(root)
  const enabled = enabledItems(items)
  const current =
    enabled.find((item) => item === document.activeElement) ??
    enabled.find((item) => item.tabIndex >= 0) ??
    enabled[0]
  if (!current) {
    return undefined
  }

  const orientation = toValue(options?.orientation) ?? 'horizontal'
  const loop = toValue(options?.loop) ?? true
  const dir = resolveDir(root, options?.dir)
  const nextIndex = nextEnabledIndex(
    enabled.indexOf(current),
    enabled.length,
    event.key,
    orientation,
    dir,
    loop,
  )
  if (nextIndex === undefined) {
    return undefined
  }

  event.preventDefault()
  const next = enabled[nextIndex]
  if (!next) {
    return undefined
  }
  applyTabStops(items, next, options)
  next.focus({ preventScroll: true })
  return next
}

function nextEnabledIndex(
  currentIndex: number,
  count: number,
  key: string,
  orientation: RovingOrientation,
  dir: TextDirection,
  loop: boolean,
): number | undefined {
  if (key === 'Home') {
    return 0
  }
  if (key === 'End') {
    return count - 1
  }

  const delta = movementDelta(key, orientation, dir)
  if (delta === undefined) {
    return undefined
  }

  const candidate = currentIndex + delta
  if (loop) {
    return (candidate + count) % count
  }
  if (candidate < 0 || candidate >= count) {
    return currentIndex
  }
  return candidate
}

function movementDelta(
  key: string,
  orientation: RovingOrientation,
  dir: TextDirection,
): number | undefined {
  const horizontal = orientation === 'horizontal' || orientation === 'both'
  const vertical = orientation === 'vertical' || orientation === 'both'

  if (horizontal) {
    if (key === (dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight')) {
      return 1
    }
    if (key === (dir === 'rtl' ? 'ArrowRight' : 'ArrowLeft')) {
      return -1
    }
  }
  if (vertical) {
    if (key === 'ArrowDown') {
      return 1
    }
    if (key === 'ArrowUp') {
      return -1
    }
  }
  return undefined
}

function resolveDir(
  root: HTMLElement,
  dir: MaybeRefOrGetter<TextDirection> | undefined,
): TextDirection {
  const explicit = toValue(dir)
  if (explicit === 'ltr' || explicit === 'rtl') {
    return explicit
  }
  const closest = root.closest('[dir]')?.getAttribute('dir')
  if (closest === 'ltr' || closest === 'rtl') {
    return closest
  }
  return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
}

/** Arrow keys inside a text field belong to the field, not the composite. */
function isEditableTarget(target: EventTarget | null): boolean {
  if (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  ) {
    return true
  }
  return target instanceof HTMLElement && target.isContentEditable
}
