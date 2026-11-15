import { defineComponent, h, type PropType } from 'vue'

import {
  GhostMenubarLabel as GhostUnstyledMenubarLabel,
  type GhostMenubarLabelElement,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarLabel} wrapper. */
export const GhostMenubarLabel = defineComponent({
  name: 'GhostMenubarLabel',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostMenubarLabelElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledMenubarLabel,
        {
          ...attrs,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostMenubarLabelElement }
