import { defineComponent, h, type PropType } from 'vue'

import {
  GhostContextMenuSeparator as GhostUnstyledContextMenuSeparator,
  type GhostContextMenuSeparatorElement,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuSeparator} wrapper. */
export const GhostContextMenuSeparator = defineComponent({
  name: 'GhostContextMenuSeparator',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuSeparatorElement>,
      default: 'div',
    },
    decorative: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(GhostUnstyledContextMenuSeparator, {
        ...attrs,
        as: props.as,
        decorative: props.decorative,
      })
  },
})

export type { GhostContextMenuSeparatorElement }
