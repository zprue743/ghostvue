import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDropdownMenuGroup as GhostUnstyledDropdownMenuGroup,
  type GhostDropdownMenuGroupElement,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuGroup} wrapper. */
export const GhostDropdownMenuGroup = defineComponent({
  name: 'GhostDropdownMenuGroup',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object, Function] as PropType<GhostDropdownMenuGroupElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledDropdownMenuGroup,
        {
          ...attrs,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostDropdownMenuGroupElement }