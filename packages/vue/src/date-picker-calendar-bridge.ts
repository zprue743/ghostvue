import type { CalendarDate } from '@internationalized/date'
import { defineComponent, inject, onUnmounted, type PropType } from 'vue'

import { ghostCalendarContextKey } from './ghost-calendar'
import { ghostDatePickerContextKey } from './ghost-date-picker'

/**
 * Internal renderless child of `GhostCalendar` inside
 * `GhostDatePickerCalendar`. Calendar context is only visible to Calendar
 * descendants, so this bridge seeds the initial roving focus date and hands
 * the Calendar's internal focus-target accessor to the picker, which uses it
 * as the dialog's initial focus target (no timers or DOM nesting queries).
 *
 * The pure annotation lets bundlers drop this module-level `defineComponent`
 * call from imports that never render a DatePicker.
 */
export const DatePickerCalendarBridge = /* @__PURE__ */ defineComponent({
  name: 'GhostDatePickerCalendarBridge',
  props: {
    focusDate: {
      type: Object as PropType<CalendarDate | undefined>,
      default: undefined,
    },
  },
  setup(props) {
    const calendar = inject(ghostCalendarContextKey, null)
    const picker = inject(ghostDatePickerContextKey, null)
    if (!calendar || !picker) {
      return () => null
    }
    // Runs before the grid renders, so the first paint already has the
    // focus date's cell as the single tab stop.
    if (props.focusDate) {
      calendar.setFocusedDate(props.focusDate, { announce: false })
    }
    const accessor = calendar.focusTarget
    picker.calendarFocus.value = accessor
    onUnmounted(() => {
      if (picker.calendarFocus.value === accessor) {
        picker.calendarFocus.value = null
      }
    })
    return () => null
  },
})
