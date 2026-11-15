import { computed, shallowRef, toValue } from 'vue'

import {
  createContextMenuVirtualReference,
  type GhostContextMenuPointerPosition,
  type UseGhostContextMenuOptions,
} from './ghost-context-menu'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'

/**
 * Headless context menu open state, deterministic SSR-safe IDs, and pointer anchor.
 */
export function useGhostContextMenu(options: UseGhostContextMenuOptions = {}) {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const triggerId = useGhostId('ghost-context-menu-trigger')
  const contentId = useGhostId('ghost-context-menu-content')
  const pointerPosition = shallowRef<GhostContextMenuPointerPosition>({
    x: 0,
    y: 0,
  })

  const virtualReference = computed(() =>
    createContextMenuVirtualReference(() => pointerPosition.value),
  )

  function open(): void {
    if (!isOpen.value) {
      isOpen.value = true
    }
  }

  function close(): void {
    if (isOpen.value) {
      isOpen.value = false
    }
  }

  function openAtPointer(x: number, y: number): void {
    pointerPosition.value = { x, y }
    open()
  }

  return {
    isOpen,
    open,
    close,
    triggerId,
    contentId,
    pointerPosition,
    virtualReference,
    openAtPointer,
  }
}
