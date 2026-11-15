import { defineComponent, h } from 'vue'

import { GhostCalendarHeading as GhostUnstyledCalendarHeading } from '@ghostvue/vue'

export const GhostCalendarHeading = defineComponent({
  name: 'GhostCalendarHeading',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(GhostUnstyledCalendarHeading, { ...attrs, 'data-themed': '' }, slots)
  },
})
