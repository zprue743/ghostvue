import { defineComponent, h } from 'vue'

import { GhostDatePickerCalendar as GhostUnstyledDatePickerCalendar } from '@ghostvue/vue'

import { GhostCalendarGrid } from './ghost-calendar-grid'
import { GhostCalendarHeader } from './ghost-calendar-header'
import { GhostCalendarHeading } from './ghost-calendar-heading'
import { GhostCalendarNextButton } from './ghost-calendar-next-button'
import { GhostCalendarPrevButton } from './ghost-calendar-prev-button'

/**
 * Themed {@link GhostDatePickerCalendar}. Calendar parts are styled by the
 * `.ghost-themed-scope` that the themed content wraps around its slot. The
 * default composition uses the themed calendar parts so the month navigation
 * shows the same chevron icon buttons as the themed GhostCalendar.
 */
export const GhostDatePickerCalendar = defineComponent({
  name: 'GhostDatePickerCalendar',
  inheritAttrs: false,
  setup(_props, { attrs, slots }) {
    return () =>
      h(
        GhostUnstyledDatePickerCalendar,
        { ...attrs },
        {
          default:
            slots['default'] ??
            (() => [
              h(GhostCalendarHeader, null, () => [
                h(GhostCalendarPrevButton),
                h(GhostCalendarHeading),
                h(GhostCalendarNextButton),
              ]),
              h(GhostCalendarGrid),
            ]),
        },
      )
  },
})
