import { toValue, watch, type MaybeRefOrGetter } from 'vue'

import {
  type GhostMenubarContext,
  type GhostMenubarMenuRegistration,
} from './ghost-menubar'
import { isDisabledElement } from './get-tabbable-elements'
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

  useRovingFocus(hostRef, {
    orientation: 'horizontal',
    loop: true,
    ...(options?.dir !== undefined ? { dir: options.dir } : {}),
  })

  function getMenubarElement(): HTMLElement | null {
    return toValue(hostRef) ?? null
  }

  function getMenubarTriggers(root: HTMLElement): HTMLElement[] {
    return Array.from(
      root.querySelectorAll<HTMLElement>('[data-part="trigger"]'),
    ).filter((element) => !isDisabledElement(element))
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

  function navigateAdjacentFromTrigger(
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

    const delta = key === 'ArrowRight' ? 1 : -1
    const nextIndex = (currentIndex + delta + triggers.length) % triggers.length
    const nextTrigger = triggers[nextIndex]
    if (!nextTrigger) {
      return
    }

    nextTrigger.focus({ preventScroll: true })
    nextTrigger.tabIndex = 0
    for (const trigger of triggers) {
      if (trigger !== nextTrigger) {
        trigger.tabIndex = -1
      }
    }

    const nextRegistration = findRegistrationByTrigger(nextTrigger)
    nextRegistration?.open()
  }

  return {
    registerMenu,
    unregisterMenu,
    navigateAdjacentFromTrigger,
    closeAllExcept,
    getMenubarElement,
  }
}
