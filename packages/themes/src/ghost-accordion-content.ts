import { defineComponent, h, type PropType } from 'vue'

import { GhostAccordionContent as GhostUnstyledAccordionContent } from '@ghostvue/vue'

/** Themed {@link GhostAccordionContent} wrapper. */
export const GhostAccordionContent = defineComponent({
  name: 'GhostAccordionContent',
  inheritAttrs: false,
  props: {
    as: {
      type: [String, Object] as PropType<string | object>,
      default: 'div',
    },
    disableAnimation: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledAccordionContent,
        {
          ...attrs,
          as: props.as,
          disableAnimation: props.disableAnimation,
          'data-themed': '',
        },
        slots,
      )
  },
})
