<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  type DateValue,
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
} from '@ghostvue/vue'

const selected = shallowRef<DateValue>(new CalendarDate(2024, 3, 15))
const month = shallowRef(new CalendarDate(2024, 3, 1))
const minValue = new CalendarDate(2024, 3, 1)
const maxValue = new CalendarDate(2024, 3, 31)
const today = new CalendarDate(2024, 3, 20)
</script>

<template>
  <GhostCalendar
    v-model="selected"
    v-model:visible-month="month"
    :min-value="minValue"
    :max-value="maxValue"
    :today="today"
  >
    <GhostCalendarHeader>
      <GhostCalendarPrevButton />
      <GhostCalendarHeading />
      <GhostCalendarNextButton />
    </GhostCalendarHeader>
    <GhostCalendarGrid />
  </GhostCalendar>
</template>
