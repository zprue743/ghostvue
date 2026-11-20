<script setup lang="ts">
import { inject } from 'vue'

import { DatePickerCalendarBridge } from './date-picker-calendar-bridge'
import { ghostDatePickerContextKey } from './ghost-date-picker'
import GhostCalendar from './GhostCalendar.vue'
import GhostCalendarGrid from './GhostCalendarGrid.vue'
import GhostCalendarHeader from './GhostCalendarHeader.vue'
import GhostCalendarHeading from './GhostCalendarHeading.vue'
import GhostCalendarNextButton from './GhostCalendarNextButton.vue'
import GhostCalendarPrevButton from './GhostCalendarPrevButton.vue'

defineSlots<{
  /**
   * Custom `GhostCalendar*` part composition. Defaults to a header with
   * previous/next month buttons and heading, followed by the grid.
   */
  default(): unknown
}>()

const injected = inject(ghostDatePickerContextKey)
if (!injected) {
  throw new Error('GhostDatePickerCalendar must be used inside GhostDatePicker')
}
const context = injected

// The calendar is display-only for the committed value: it shows the
// committed value (or the pending range anchor) through a controlled
// `modelValue` and its `update:modelValue` proposals are ignored. Only
// `select` activations change picker state, so a new range always starts
// cleanly, even over a committed one-day range.
</script>

<template>
  <GhostCalendar
    :model-value="context.calendarValue.value"
    :selection-mode="context.selectionMode.value"
    :min-value="context.minValue.value"
    :max-value="context.maxValue.value"
    :is-date-disabled="context.isDateDisabled.value"
    :locale="context.locale.value"
    :week-starts-on="context.weekStartsOn.value"
    :today="context.today.value"
    :default-visible-month="context.initialVisibleMonth.value"
    :disabled="context.hasConfigurationError.value"
    @select="context.selectCalendarDate"
  >
    <DatePickerCalendarBridge :focus-date="context.initialFocusDate.value" />
    <slot>
      <GhostCalendarHeader>
        <GhostCalendarPrevButton />
        <GhostCalendarHeading />
        <GhostCalendarNextButton />
      </GhostCalendarHeader>
      <GhostCalendarGrid />
    </slot>
  </GhostCalendar>
</template>
