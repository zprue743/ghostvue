import { computed, toValue } from 'vue'

import { useDialogState } from './dialog-shared'
import type {
  UseGhostDrawerOptions,
  UseGhostDrawerReturn,
} from './ghost-drawer'

/**
 * Headless drawer open state, modal flag, placement, and deterministic
 * SSR-safe IDs (`ghost-drawer-*`).
 *
 * Open state uses the same controllable-state implementation as
 * `useGhostDialog`; `side` defaults to `'end'` and `dir` stays `undefined`
 * unless set explicitly, so DOM-based direction resolution can run later in
 * `GhostDrawerContent` on the client.
 */
export function useGhostDrawer(
  options: UseGhostDrawerOptions = {},
): UseGhostDrawerReturn {
  const state = useDialogState(options, 'ghost-drawer')
  return {
    ...state,
    side: computed(() => toValue(options.side) ?? 'end'),
    dir: computed(() => toValue(options.dir)),
  }
}
