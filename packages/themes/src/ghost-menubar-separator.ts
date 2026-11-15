import { defineComponent, h, type PropType } from 'vue'

import {
  GhostMenubarSeparator as GhostUnstyledMenubarSeparator,
  type GhostMenubarSeparatorElement,
} from '@ghostvue/vue'

/** Themed {@link GhostMenubarSeparator} wrapper. */
export const GhostMenubarSeparator = defineComponent({
  name: 'GhostMenubarSeparator',
  inheritAttrs: false,
  props: {
    as: {
      type: [
        String,
        Object,
        Function,
      ] as PropType<GhostMenubarSeparatorElement>,
      default: 'div',
    },
    decorative: {
      type: Boolean,
      default: false,
    },
  },
  setup(props, { attrs }) {
    return () =>
      h(GhostUnstyledMenubarSeparator, {
        ...attrs,
        as: props.as,
        decorative: props.decorative,
      })
  },
})

export type { GhostMenubarSeparatorElement }
