import { defineComponent, h, type PropType } from 'vue'

import {
  GhostCalendarCell as GhostUnstyledCalendarCell,
  type CalendarDate,
} from '@ghostvue/vue'

export const GhostCalendarCell = defineComponent({
  name: 'GhostCalendarCell',
  inheritAttrs: false,
  props: {
    date: { type: Object as PropType<CalendarDate>, required: true },
  },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledCalendarCell,
        { ...attrs, date: props.date, 'data-themed': '' },
        slots,
      )
  },
})
