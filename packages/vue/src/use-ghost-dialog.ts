import { computed, toValue } from 'vue'

import type {
  UseGhostDialogOptions,
  UseGhostDialogReturn,
} from './ghost-dialog'
import { useControllableState } from './use-controllable-state'
import { useGhostId } from './use-ghost-id'

/**
 * Headless dialog open state, modal mode flag, and deterministic SSR-safe IDs.
 *
 * Uses {@link useControllableState} so `open` can be either controlled or
 * uncontrolled while calling `onOpenChange` on every user-initiated transition.
 */
export function useGhostDialog(
  options: UseGhostDialogOptions = {},
): UseGhostDialogReturn {
  const isOpen = useControllableState<boolean>({
    prop: () => toValue(options.open),
    defaultValue: () => toValue(options.defaultOpen) ?? false,
    onChange: (next) => {
      options.onOpenChange?.(next)
    },
  })

  const isModal = computed(() => toValue(options.modal) ?? true)

  const triggerId = useGhostId('ghost-dialog-trigger')
  const contentId = useGhostId('ghost-dialog-content')
  const titleId = useGhostId('ghost-dialog-title')
  const descriptionId = useGhostId('ghost-dialog-description')

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
    isModal,
    open,
    close,
    toggle,
    triggerId,
    contentId,
    titleId,
    descriptionId,
  }
}
