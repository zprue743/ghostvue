import { shallowRef, toValue, watch, type MaybeRefOrGetter } from 'vue'

import {
  type GhostMenubarContext,
  type GhostMenubarMenuRegistration,
} from './ghost-menubar'
import { getTabbableElements, isDisabledElement } from './get-tabbable-elements'
import { useRovingFocus, type TextDirection } from './use-roving-focus'

export interface UseGhostMenubarOptions {
  dir?: MaybeRefOrGetter<TextDirection>
}

interface RegisteredMenu extends GhostMenubarMenuRegistration {
  stopWatch: () => void
}

/**
 * Menubar root: horizontal roving focus among triggers and at-most-one open menu.
 */
export function useGhostMenubar(
  hostRef: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: UseGhostMenubarOptions,
): GhostMenubarContext {
  const registrations = new Map<symbol, RegisteredMenu>()
  const triggerTabStop = shallowRef<HTMLElement | null>(null)

  useRovingFocus(hostRef, {
    orientation: 'horizontal',
    loop: true,
    ...(options?.dir !== undefined ? { dir: options.dir } : {}),
    onTabStopChange: (current) => {
      triggerTabStop.value = current ?? null
    },
  })

  function getMenubarElement(): HTMLElement | null {
    return toValue(hostRef) ?? null
  }

  function getMenubarTriggers(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>('[data-part="trigger"]'),
    ).filter((element) => !isDisabledElement(element))
  }

  function hasOpenMenu(): boolean {
    for (const entry of registrations.values()) {
      if (entry.isOpen.value) {
        return true
      }
    }
    return false
  }

  function closeAllExcept(exceptId: symbol | null): void {
    for (const [id, entry] of registrations) {
      if (id !== exceptId && entry.isOpen.value) {
        entry.close()
      }
    }
  }

  function findRegistrationByTrigger(
    trigger: HTMLElement,
  ): RegisteredMenu | undefined {
    for (const entry of registrations.values()) {
      if (entry.triggerElement.value === trigger) {
        return entry
      }
    }
    return undefined
  }

  function registerMenu(id: symbol, entry: GhostMenubarMenuRegistration): void {
    const stopWatch = watch(entry.isOpen, (open) => {
      if (open) {
        closeAllExcept(id)
      }
    })
    registrations.set(id, { ...entry, stopWatch })
  }

  function unregisterMenu(id: symbol): void {
    const entry = registrations.get(id)
    entry?.stopWatch()
    registrations.delete(id)
  }

  function resolveDir(root: HTMLElement): TextDirection {
    const explicit = toValue(options?.dir)
    if (explicit === 'ltr' || explicit === 'rtl') {
      return explicit
    }
    const closest = root.closest('[dir]')?.getAttribute('dir')
    if (closest === 'ltr' || closest === 'rtl') {
      return closest
    }
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  }

  function nextTriggerIndex(
    triggers: HTMLElement[],
    currentIndex: number,
    key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
  ): number {
    if (key === 'Home') {
      return 0
    }
    if (key === 'End') {
      return triggers.length - 1
    }

    const root = getMenubarElement()
    if (!root) {
      return currentIndex
    }
    const dir = resolveDir(root)
    const delta = key === (dir === 'rtl' ? 'ArrowLeft' : 'ArrowRight') ? 1 : -1
    return (currentIndex + delta + triggers.length) % triggers.length
  }

  function moveTriggerFocus(
    currentTrigger: HTMLElement,
    key: 'ArrowLeft' | 'ArrowRight' | 'Home' | 'End',
  ): void {
    const root = getMenubarElement()
    if (!root) {
      return
    }

    const triggers = getMenubarTriggers(root)
    const currentIndex = triggers.indexOf(currentTrigger)
    if (currentIndex === -1) {
      return
    }

    const nextIndex = nextTriggerIndex(triggers, currentIndex, key)
    const nextTrigger = triggers[nextIndex]
    if (!nextTrigger) {
      return
    }

    nextTrigger.focus({ preventScroll: true })
    triggerTabStop.value = nextTrigger
  }

  function openAdjacentMenu(
    currentTrigger: HTMLElement,
    key: 'ArrowLeft' | 'ArrowRight',
  ): void {
    const root = getMenubarElement()
    if (!root) {
      return
    }

    const currentRegistration = findRegistrationByTrigger(currentTrigger)
    if (currentRegistration?.isOpen.value) {
      currentRegistration.close()
    }

    const triggers = getMenubarTriggers(root)
    const currentIndex = triggers.indexOf(currentTrigger)
    if (currentIndex === -1) {
      return
    }

    const nextIndex = nextTriggerIndex(triggers, currentIndex, key)
    const nextTrigger = triggers[nextIndex]
    if (!nextTrigger) {
      return
    }

    nextTrigger.focus({ preventScroll: true })
    triggerTabStop.value = nextTrigger

    const nextRegistration = findRegistrationByTrigger(nextTrigger)
    if (!nextRegistration) {
      return
    }

    nextRegistration.setFocusLastOnOpen(false)
    nextRegistration.open()
  }

  function focusNextTabStopAfterMenubar(from?: HTMLElement | null): void {
    const tabbables = getTabbableElements(document.body)

    const current =
      from ??
      (document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null)
    if (current) {
      const currentIndex = tabbables.indexOf(current)
      if (currentIndex >= 0) {
        tabbables[currentIndex + 1]?.focus({ preventScroll: true })
        return
      }
    }

    const root = getMenubarElement()
    if (!root) {
      return
    }

    const triggers = getMenubarTriggers(root)
    let lastIndex = -1
    for (const trigger of triggers) {
      const index = tabbables.indexOf(trigger)
      if (index > lastIndex) {
        lastIndex = index
      }
    }

    tabbables[lastIndex + 1]?.focus({ preventScroll: true })
  }

  return {
    registerMenu,
    unregisterMenu,
    triggerTabStop,
    hasOpenMenu,
    moveTriggerFocus,
    openAdjacentMenu,
    focusNextTabStopAfterMenubar,
    closeAllExcept,
    getMenubarElement,
  }
}
