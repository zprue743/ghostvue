import { defineComponent, h } from 'vue'

import { GhostCalendarNextButton as GhostUnstyledCalendarNextButton } from '@ghostvue/vue'

export const GhostCalendarNextButton = defineComponent({
  name: 'GhostCalendarNextButton',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(GhostUnstyledCalendarNextButton, { ...attrs, 'data-themed': '' }, slots)
  },
})
