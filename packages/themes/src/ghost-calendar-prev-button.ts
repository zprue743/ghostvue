import { defineComponent, h } from 'vue'

import { GhostCalendarPrevButton as GhostUnstyledCalendarPrevButton } from '@ghostvue/vue'

export const GhostCalendarPrevButton = defineComponent({
  name: 'GhostCalendarPrevButton',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(GhostUnstyledCalendarPrevButton, { ...attrs, 'data-themed': '' }, slots)
  },
})
