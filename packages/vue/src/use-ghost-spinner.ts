import { computed, toValue, type ComputedRef } from 'vue'

import type { UseGhostSpinnerOptions } from './ghost-spinner'

export interface GhostSpinnerRootProps {
  class: 'ghost-spinner'
  role: 'status'
  'data-part': 'root'
}

/**
 * Status semantics for an indeterminate indicator. `role="status"` is the APG
 * live-region role (implicit polite/atomic). Native `<progress>` and
 * `role="progressbar"` are rejected: this is not determinate, and replaced
 * progress elements cannot be restyled as a compact spinner in headless CSS.
 */
export function useGhostSpinner(options: UseGhostSpinnerOptions = {}): {
  /** Visually hidden live-region content. */
  label: ComputedRef<string>
  rootProps: ComputedRef<GhostSpinnerRootProps>
} {
  const label = computed(() => toValue(options.label) ?? 'Loading')

  const rootProps = computed((): GhostSpinnerRootProps => ({
    class: 'ghost-spinner',
    role: 'status',
    'data-part': 'root',
  }))

  return { label, rootProps }
}
