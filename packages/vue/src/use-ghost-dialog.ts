import { useDialogState } from './dialog-shared'
import type {
  UseGhostDialogOptions,
  UseGhostDialogReturn,
} from './ghost-dialog'

/**
 * Headless dialog open state, modal mode flag, and deterministic SSR-safe IDs.
 *
 * Uses `useControllableState` so `open` can be either controlled or
 * uncontrolled while calling `onOpenChange` on every user-initiated transition.
 * The implementation is shared with `useGhostDrawer` through the internal
 * `dialog-shared` module.
 */
export function useGhostDialog(
  options: UseGhostDialogOptions = {},
): UseGhostDialogReturn {
  return useDialogState(options, 'ghost-dialog')
}
