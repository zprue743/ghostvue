import { defineComponent, h, type PropType } from 'vue'

import {
  GhostContextMenuLabel as GhostUnstyledContextMenuLabel,
  type GhostContextMenuLabelElement,
} from '@ghostvue/vue'

/** Themed {@link GhostContextMenuLabel} wrapper. */
export const GhostContextMenuLabel = defineComponent({
  name: 'GhostContextMenuLabel',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostContextMenuLabelElement>,
      default: 'div',
    },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledContextMenuLabel,
        {
          ...attrs,
          as: props.as,
        },
        slots,
      )
  },
})

export type { GhostContextMenuLabelElement }
