import {
  onMounted,
  onUnmounted,
  toValue,
  watch,
  type MaybeRefOrGetter,
} from 'vue'

import { isDisabledElement } from './get-tabbable-elements'

export const MENU_ITEM_SELECTOR =
  '[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"]'

export type GhostMenuCollectionCloseReason = 'tab'

export interface UseGhostMenuCollectionOptions {
  onItemSelect?: (element: HTMLElement) => void
  /** APG: Tab closes the menu without restoring focus to the trigger. */
  onClose?: (reason?: GhostMenuCollectionCloseReason) => void
}

/** Enabled menu items inside `root`, in DOM order. */
export function getMenuItems(root: ParentNode): HTMLElement[] {
  const items = [
    ...root.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR),
  ].filter((item) => !isDisabledElement(item))
  return items
}

/** Roving tabindex: focus the first enabled item. */
export function focusFirstMenuItem(root: ParentNode): boolean {
  const items = getMenuItems(root)
  const first = items[0]
  if (!first) {
    return false
  }
  applyMenuTabStops(items, first)
  first.focus({ preventScroll: true })
  return true
}

/** Roving tabindex: focus the last enabled item. */
export function focusLastMenuItem(root: ParentNode): boolean {
  const items = getMenuItems(root)
  if (items.length === 0) {
    return false
  }
  const last = items[items.length - 1]
  if (!last) {
    return false
  }
  applyMenuTabStops(items, last)
  last.focus({ preventScroll: true })
  return true
}

function getAllMenuItems(root: ParentNode): HTMLElement[] {
  return [...root.querySelectorAll<HTMLElement>(MENU_ITEM_SELECTOR)]
}

function enabledMenuItems(items: HTMLElement[]): HTMLElement[] {
  return items.filter((item) => !isDisabledElement(item))
}

function applyMenuTabStops(
  items: HTMLElement[],
  current: HTMLElement | undefined,
): void {
  for (const item of items) {
    item.tabIndex = item === current && !isDisabledElement(item) ? 0 : -1
  }
}

function syncMenuTabStops(root: HTMLElement): void {
  const items = getAllMenuItems(root)
  const enabled = enabledMenuItems(items)
  const current =
    enabled.find((item) => item.tabIndex >= 0) ??
    enabled.find((item) => item === document.activeElement) ??
    enabled[0]
  applyMenuTabStops(items, current)
}

/**
 * APG menu keyboard behavior: vertical roving, typeahead, and item activation.
 * Listeners attach in `onMounted` so SSR setup does not touch the document.
 */
export function useGhostMenuCollection(
  container: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseGhostMenuCollectionOptions,
): void {
  let stopWatch: (() => void) | undefined
  let typeahead = ''
  let typeaheadTimer: ReturnType<typeof setTimeout> | undefined

  onMounted(() => {
    stopWatch = watch(
      () => toValue(container),
      (element, _previous, onCleanup) => {
        if (!element) {
          return
        }

        syncMenuTabStops(element)

        const onKeyDown = (event: KeyboardEvent): void => {
          handleMenuKeyDown(event, element, options, {
            getTypeahead: () => typeahead,
            setTypeahead: (next) => {
              typeahead = next
            },
            resetTypeaheadTimer: () => {
              if (typeaheadTimer !== undefined) {
                clearTimeout(typeaheadTimer)
              }
              typeaheadTimer = setTimeout(() => {
                typeahead = ''
                typeaheadTimer = undefined
              }, 500)
            },
          })
        }

        const onFocusIn = (event: FocusEvent): void => {
          const target = event.target
          if (!(target instanceof HTMLElement) || !element.contains(target)) {
            return
          }
          if (!target.matches(MENU_ITEM_SELECTOR)) {
            return
          }
          const items = getAllMenuItems(element)
          if (items.includes(target)) {
            applyMenuTabStops(items, target)
          }
        }

        element.addEventListener('keydown', onKeyDown)
        element.addEventListener('focusin', onFocusIn)
        onCleanup(() => {
          element.removeEventListener('keydown', onKeyDown)
          element.removeEventListener('focusin', onFocusIn)
          if (typeaheadTimer !== undefined) {
            clearTimeout(typeaheadTimer)
          }
        })
      },
      { immediate: true },
    )
  })

  onUnmounted(() => {
    stopWatch?.()
  })
}

interface TypeaheadState {
  getTypeahead: () => string
  setTypeahead: (value: string) => void
  resetTypeaheadTimer: () => void
}

function handleMenuKeyDown(
  event: KeyboardEvent,
  root: HTMLElement,
  options: UseGhostMenuCollectionOptions | undefined,
  typeaheadState: TypeaheadState,
): void {
  if (event.defaultPrevented || isEditableTarget(event.target)) {
    return
  }

  if (event.key === 'Tab') {
    options?.onClose?.('tab')
    return
  }

  const items = getAllMenuItems(root)
  const enabled = enabledMenuItems(items)
  const active =
    enabled.find((item) => item === document.activeElement) ??
    enabled.find((item) => item.tabIndex >= 0) ??
    enabled[0]

  const arrowDelta = menuArrowDelta(event.key)
  if (arrowDelta !== undefined && active) {
    event.preventDefault()
    const index = enabled.indexOf(active)
    const nextIndex = loopIndex(index + arrowDelta, enabled.length)
    const next = enabled[nextIndex]
    if (next) {
      applyMenuTabStops(items, next)
      next.focus({ preventScroll: true })
    }
    return
  }

  if (event.key === 'Home' && enabled[0]) {
    event.preventDefault()
    applyMenuTabStops(items, enabled[0])
    enabled[0].focus({ preventScroll: true })
    return
  }

  if (event.key === 'End') {
    const last = enabled[enabled.length - 1]
    if (last) {
      event.preventDefault()
      applyMenuTabStops(items, last)
      last.focus({ preventScroll: true })
    }
    return
  }

  if (isPrintableKey(event)) {
    const nextQuery = typeaheadState.getTypeahead() + event.key
    typeaheadState.setTypeahead(nextQuery)
    typeaheadState.resetTypeaheadTimer()
    const match = findTypeaheadMatch(enabled, nextQuery, active)
    if (match) {
      event.preventDefault()
      applyMenuTabStops(items, match)
      match.focus({ preventScroll: true })
    }
    return
  }

  if (event.key === 'Enter' || event.key === ' ') {
    const target = event.target
    if (!(target instanceof HTMLElement) || !root.contains(target)) {
      return
    }
    if (!target.matches(MENU_ITEM_SELECTOR) || isDisabledElement(target)) {
      return
    }

    const role = target.getAttribute('role')
    if (role === 'menuitemcheckbox') {
      // Checkbox items own Space/Enter toggling on the host element.
      return
    }

    if (role === 'menuitem' || role === 'menuitemradio') {
      event.preventDefault()
      if (role === 'menuitemradio') {
        target.click()
      } else {
        options?.onItemSelect?.(target)
        target.click()
      }
      return
    }
  }
}

function menuArrowDelta(key: string): number | undefined {
  if (key === 'ArrowDown') {
    return 1
  }
  if (key === 'ArrowUp') {
    return -1
  }
  return undefined
}

function loopIndex(index: number, count: number): number {
  if (count === 0) {
    return 0
  }
  return (index + count) % count
}

function isPrintableKey(event: KeyboardEvent): boolean {
  if (event.ctrlKey || event.metaKey || event.altKey) {
    return false
  }
  return event.key.length === 1
}

function findTypeaheadMatch(
  items: HTMLElement[],
  query: string,
  active: HTMLElement | undefined,
): HTMLElement | undefined {
  const normalized = query.trim().toLowerCase()
  if (normalized.length === 0) {
    return undefined
  }
  const start = active ? items.indexOf(active) + 1 : 0
  for (let offset = 0; offset < items.length; offset++) {
    const item = items[(start + offset) % items.length]
    if (!item) {
      continue
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- live DOM allows null `textContent`.
    const text = (item.textContent ?? '').trim().toLowerCase()
    if (text.startsWith(normalized)) {
      return item
    }
  }
  return undefined
}

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
