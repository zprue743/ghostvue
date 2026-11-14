import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDropdownMenuLabel as GhostUnstyledDropdownMenuLabel,
  type GhostDropdownMenuLabelElement,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuLabel} wrapper. */
export const GhostDropdownMenuLabel = defineComponent({
  name: 'GhostDropdownMenuLabel',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDropdownMenuLabelElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledDropdownMenuLabel,
        {
          ...attrs,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostDropdownMenuLabelElement }