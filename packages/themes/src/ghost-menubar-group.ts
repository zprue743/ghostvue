import { defineComponent, h, type PropType } from 'vue'

import {
  GhostMenubarGroup as GhostUnstyledMenubarGroup,
  type GhostMenubarGroupElement,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarGroup} wrapper. */
export const GhostMenubarGroup = defineComponent({
  name: 'GhostMenubarGroup',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostMenubarGroupElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledMenubarGroup,
        {
          ...attrs,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostMenubarGroupElement }
