import { computed, type ComputedRef } from 'vue'

/** Bindings returned by {@link useGhostBadge} for the unstyled root. */
export interface GhostBadgeRootProps {
  class: 'ghost-badge'
  'data-part': 'root'
}

/**
 * Styling-hook bindings for a non-interactive badge. No `data-state`: the
 * contract has no behavioral states, and inventing one would pre-empt GHO-38.
 */
export function useGhostBadge(): {
  rootProps: ComputedRef<GhostBadgeRootProps>
} {
  const rootProps = computed((): GhostBadgeRootProps => ({
    class: 'ghost-badge',
    'data-part': 'root',
  }))

  return { rootProps }
}
