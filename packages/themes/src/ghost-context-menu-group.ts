import { defineComponent, h, type PropType } from 'vue'

import {
  GhostContextMenuGroup as GhostUnstyledContextMenuGroup,
  type GhostContextMenuGroupElement,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuGroup} wrapper. */
export const GhostContextMenuGroup = defineComponent({
  name: 'GhostContextMenuGroup',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuGroupElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledContextMenuGroup,
        {
          ...attrs,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostContextMenuGroupElement }
