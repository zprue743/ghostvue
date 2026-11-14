import { computed, toValue, type ComputedRef } from 'vue'

import { useGhostId } from './use-ghost-id'
import type {
  GhostEmptyStateElement,
  GhostEmptyStateHeadingLevel,
  UseGhostEmptyStateOptions,
} from './ghost-empty-state'

export interface GhostEmptyStateRootProps {
  class: 'ghost-empty-state'
  'data-part': 'root'
  'data-ghost-empty-state': ''
  'aria-labelledby'?: string
}

/**
 * Root bindings for an empty-state region. When a title is present, links the
 * root to the generated heading id.
 */
export function useGhostEmptyState(options: UseGhostEmptyStateOptions = {}): {
  as: ComputedRef<GhostEmptyStateElement>
  headingTag: ComputedRef<`h${GhostEmptyStateHeadingLevel}`>
  titleId: ComputedRef<string>
  rootProps: ComputedRef<GhostEmptyStateRootProps>
} {
  const generatedTitleId = useGhostId('ghost-empty-state-title')

  const as = computed(
    (): GhostEmptyStateElement => toValue(options.as) ?? 'div',
  )

  const headingLevel = computed((): GhostEmptyStateHeadingLevel => {
    const level = toValue(options.headingLevel) ?? 3
    return level
  })

  const headingTag = computed((): `h${GhostEmptyStateHeadingLevel}` => {
    return `h${String(headingLevel.value)}` as `h${GhostEmptyStateHeadingLevel}`
  })

  const titleId = computed(
    () => toValue(options.titleId) ?? generatedTitleId.value,
  )

  const rootProps = computed((): GhostEmptyStateRootProps => {
    const base: GhostEmptyStateRootProps = {
      class: 'ghost-empty-state',
      'data-part': 'root',
      'data-ghost-empty-state': '',
    }

    // aria-labelledby names the root; generic/div has no nameable role (axe
    // aria-prohibited-attr). section becomes a region once labelled.
    const labelledRoot = toValue(options.hasTitle) && as.value === 'section'

    if (labelledRoot) {
      return {
        ...base,
        'aria-labelledby': titleId.value,
      }
    }

    return base
  })

  return { as, headingTag, titleId, rootProps }
}
