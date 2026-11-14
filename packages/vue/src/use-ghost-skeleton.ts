import { computed, type ComputedRef } from 'vue'

export interface GhostSkeletonRootProps {
  class: 'ghost-skeleton'
  'data-part': 'root'
  'aria-hidden': 'true'
  inert: true
}

/**
 * Decorative loading placeholder bindings.
 *
 * `aria-hidden` hides the bone from assistive technology so a table of cells
 * does not announce empty graphics. `role="presentation"` is rejected because
 * it would still expose descendant text. `inert` is the native way to keep the
 * subtree out of tab order; `aria-hidden` alone would fail axe
 * `aria-hidden-focus` if a consumer slotted a control.
 */
export function useGhostSkeleton(): {
  rootProps: ComputedRef<GhostSkeletonRootProps>
} {
  const rootProps = computed((): GhostSkeletonRootProps => ({
    class: 'ghost-skeleton',
    'data-part': 'root',
    'aria-hidden': 'true',
    inert: true,
  }))

  return { rootProps }
}
