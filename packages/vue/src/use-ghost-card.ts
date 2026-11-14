import { computed, toValue, type ComputedRef } from 'vue'

import type { GhostCardElement, UseGhostCardOptions } from './ghost-card'

export interface GhostCardRootProps {
  class: 'ghost-card'
  'data-part': 'root'
  'data-ghost-card': ''
}

/**
 * Root bindings for a card surface. Layout and elevation stay consumer-owned.
 */
export function useGhostCard(options: UseGhostCardOptions = {}): {
  as: ComputedRef<GhostCardElement>
  rootProps: ComputedRef<GhostCardRootProps>
  isActionRoot: ComputedRef<boolean>
} {
  const as = computed((): GhostCardElement => toValue(options.as) ?? 'article')

  const isActionRoot = computed(() => as.value === 'a' || as.value === 'button')

  const rootProps = computed((): GhostCardRootProps => ({
    class: 'ghost-card',
    'data-part': 'root',
    'data-ghost-card': '',
  }))

  return { as, rootProps, isActionRoot }
}
