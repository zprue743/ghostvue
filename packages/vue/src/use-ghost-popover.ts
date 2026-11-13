import { toValue } from 'vue'

import type {
  UseGhostPopoverOptions,
  UseGhostPopoverReturn,
} from './ghost-popover'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'

/**
 * Headless popover open state and deterministic SSR-safe IDs.
 *
 * Uses {@link useControllableState} so `open` can be either controlled or
 * uncontrolled while calling `onOpenChange` on every user-initiated transition.
 */
export function useGhostPopover(
  options: UseGhostPopoverOptions = {},
): UseGhostPopoverReturn {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const triggerId = useGhostId('ghost-popover-trigger')
  const contentId = useGhostId('ghost-popover-content')

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
