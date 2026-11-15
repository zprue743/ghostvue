import { defineComponent, h, type PropType } from 'vue'

import {
  GhostScrollArea as GhostUnstyledScrollArea,
  type GhostScrollAreaOrientation,
  type GhostScrollAreaOverflowType,
} from '@ghostvue/vue'

/**
 * Themed wrapper: `data-themed` scopes recipes without an extra layout wrapper.
 * Behavior stays on the unstyled primitive; sizing attrs fall through to the root.
 */
export const GhostScrollArea = defineComponent({
  name: 'GhostScrollArea',
  inheritAttrs: false,
  props: {
    as: { type: String as PropType<'div'>, default: 'div' },
    label: { type: String, default: undefined },
    orientation: {
      type: String as PropType<GhostScrollAreaOrientation>,
      default: 'vertical',
    },
    type: {
      type: String as PropType<GhostScrollAreaOverflowType>,
      default: 'auto',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledScrollArea,
        {
          ...attrs,
          as: props.as,
          'data-themed': '',
          ...(props.label ? { label: props.label } : {}),
          orientation: props.orientation,
          type: props.type,
        },
        slots,
      )
  },
})

export type { GhostScrollAreaOrientation, GhostScrollAreaOverflowType }
