import { toValue } from 'vue'

import type {
  UseGhostDropdownMenuOptions,
  UseGhostDropdownMenuReturn,
} from './ghost-dropdown-menu'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'

/**
 * Headless dropdown menu open state and deterministic SSR-safe IDs.
 */
export function useGhostDropdownMenu(
  options: UseGhostDropdownMenuOptions = {},
): UseGhostDropdownMenuReturn {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const triggerId = useGhostId('ghost-dropdown-menu-trigger')
  const contentId = useGhostId('ghost-dropdown-menu-content')

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

  function toggle(): void {
    isOpen.value = !isOpen.value
  }

  return {
    isOpen,
    open,
    close,
    toggle,
    triggerId,
    contentId,
  }
}