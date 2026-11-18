import { defineComponent, h } from 'vue'

import { GhostAccordionItem as GhostUnstyledAccordionItem } from '@ghostvue/vue'

/** Themed {@link GhostAccordionItem} wrapper. */
export const GhostAccordionItem = defineComponent({
  name: 'GhostAccordionItem',
  inheritAttrs: false,
  props: {
    value: { type: String, required: true },
    disabled: { type: Boolean, default: false },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledAccordionItem,
        // `data-themed` opts this item (and its header) into ghost-accordion.css.
        { ...attrs, ...props, 'data-themed': '' },
        slots,
      )
  },
})
