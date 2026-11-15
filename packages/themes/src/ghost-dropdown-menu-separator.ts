import { defineComponent, h, type PropType } from 'vue'

import {
  GhostDropdownMenuSeparator as GhostUnstyledDropdownMenuSeparator,
  type GhostDropdownMenuSeparatorElement,
} from '@ghostvue/vue'

/** Themed {@link GhostDropdownMenuSeparator} wrapper. */
export const GhostDropdownMenuSeparator = defineComponent({
  name: 'GhostDropdownMenuSeparator',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostDropdownMenuSeparatorElement>,
      default: 'div',
    },
    decorative: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(GhostUnstyledDropdownMenuSeparator, {
        ...attrs,
        as: props.as,
        decorative: props.decorative,
      })
  },
})

export type { GhostDropdownMenuSeparatorElement }
