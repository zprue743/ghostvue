import { defineComponent, h } from 'vue'

import { GhostCalendarHeader as GhostUnstyledCalendarHeader } from '@ghostvue/vue'

export const GhostCalendarHeader = defineComponent({
  name: 'GhostCalendarHeader',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(GhostUnstyledCalendarHeader, { ...attrs, 'data-themed': '' }, slots)
  },
})
