import { defineComponent, h, ref, type PropType } from 'vue'

import {
  GhostEmptyState as GhostUnstyledEmptyState,
  type GhostEmptyStateExposed,
  type GhostEmptyStateHeadingLevel,
  type GhostEmptyStateElement,
} from '@ghostvue/vue'

/**
 * Themed wrapper: `data-themed` for recipes without an extra layout wrapper.
 * Behavior and reading order stay on the unstyled primitive.
 */
export const GhostEmptyState = defineComponent({
  name: 'GhostEmptyState',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<GhostEmptyStateElement>,
      default: 'div',
    },
    headingLevel: {
      type: Number as PropType<GhostEmptyStateHeadingLevel>,
      default: 3,
    },
  },
  setup(props, { attrs, slots, expose }) {
    const inner = ref<GhostEmptyStateExposed | null>(null)

    expose({
      get element() {
        return inner.value?.element ?? null
      },
    } satisfies GhostEmptyStateExposed)

    return () =>
      h(
        GhostUnstyledEmptyState,
        {
          ...attrs,
          as: props.as,
          headingLevel: props.headingLevel,
          ref: inner,
          'data-themed': '',
        },
        slots,
      )
  },
})

export type { GhostEmptyStateExposed }
