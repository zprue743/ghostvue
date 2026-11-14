import { computed, type ComputedRef, toValue, type MaybeRefOrGetter } from 'vue'

import type { GhostBreadcrumbProps } from './ghost-breadcrumb'

/** Bindings returned by {@link useGhostBreadcrumb} for the root landmark. */
export interface GhostBreadcrumbRootProps {
  class: 'ghost-breadcrumb'
  'data-part': 'root'
  'data-ghost-breadcrumb': ''
  'aria-label': string
}

export interface UseGhostBreadcrumbOptions {
  ariaLabel?: MaybeRefOrGetter<string | undefined>
}

/**
 * Styling and accessibility bindings for the breadcrumb navigation root.
 */
export function useGhostBreadcrumb(options: UseGhostBreadcrumbOptions = {}): {
  rootProps: ComputedRef<GhostBreadcrumbRootProps>
} {
  const rootProps = computed((): GhostBreadcrumbRootProps => ({
    class: 'ghost-breadcrumb',
    'data-part': 'root',
    'data-ghost-breadcrumb': '',
    'aria-label': toValue(options.ariaLabel) ?? 'Breadcrumb',
  }))

  return { rootProps }
}

export type { GhostBreadcrumbProps }
