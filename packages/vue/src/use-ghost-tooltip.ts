import { toValue } from 'vue'

import type {
  UseGhostTooltipOptions,
  UseGhostTooltipReturn,
} from './ghost-tooltip'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'

/**
 * Headless tooltip open state and deterministic SSR-safe IDs.
 *
 * Uses {@link useControllableState} so `open` can be either controlled or
 * uncontrolled while calling `onOpenChange` on every transition.
 */
export function useGhostTooltip(
  options: UseGhostTooltipOptions = {},
): UseGhostTooltipReturn {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const triggerId = useGhostId('ghost-tooltip-trigger')
  const contentId = useGhostId('ghost-tooltip-content')

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
