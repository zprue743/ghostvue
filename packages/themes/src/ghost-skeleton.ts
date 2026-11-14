import { defineComponent, h, type PropType } from 'vue'

import {
  GhostSkeleton as GhostUnstyledSkeleton,
  type GhostSkeletonElement,
} from '@ghostvue/vue'

/** Visual treatment for the themed skeleton. Omitting it selects `text`. */
export type GhostSkeletonShape = 'text' | 'rect' | 'circle'

/**
 * Themed wrapper: `shape` as `data-shape`, `data-themed` for recipes. No extra
 * span — a wrapper between `tr` and `td` is invalid HTML. Behavior stays on
 * the unstyled primitive; native attrs fall through for dimensions.
 */
export const GhostSkeleton = defineComponent({
  name: 'GhostSkeleton',
  inheritAttrs: false,
  props: {
    as: {
      type: String as PropType<GhostSkeletonElement>,
      default: 'span',
    },
    shape: {
      type: String as PropType<GhostSkeletonShape>,
      default: 'text',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledSkeleton,
        {
          ...attrs,
          as: props.as,
          // Same attachment hook as themed popover content (portals / invalid wrappers).
          'data-themed': '',
          // CSS treats a missing hook as the text default.
          'data-shape': props.shape === 'text' ? undefined : props.shape,
        },
        slots,
      )
  },
})

export type { GhostSkeletonElement }
