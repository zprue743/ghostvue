import { defineComponent, h } from 'vue'

import { GhostDatePickerCalendar as GhostUnstyledDatePickerCalendar } from '@ghostvue/vue'

/**
 * Themed {@link GhostDatePickerCalendar}. Calendar parts are styled by the
 * `.ghost-themed-scope` that the themed content wraps around its slot.
 */
export const GhostDatePickerCalendar = defineComponent({
  name: 'GhostDatePickerCalendar',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () => h(GhostUnstyledDatePickerCalendar, { ...attrs }, slots)
  },
})
