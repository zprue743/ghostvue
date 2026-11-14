import { toValue } from 'vue'

import type {
  UseGhostHoverCardOptions,
  UseGhostHoverCardReturn,
} from './ghost-hover-card'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'

/**
 * Headless hover-card open state and deterministic SSR-safe IDs.
 *
 * Uses {@link useControllableState} so `open` can be either controlled or
 * uncontrolled while calling `onOpenChange` on every user-initiated transition.
 */
export function useGhostHoverCard(
  options: UseGhostHoverCardOptions = {},
): UseGhostHoverCardReturn {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const triggerId = useGhostId('ghost-hover-card-trigger')
  const contentId = useGhostId('ghost-hover-card-content')

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

  return {
    isOpen,
    open,
    close,
    triggerId,
    contentId,
  }
}
