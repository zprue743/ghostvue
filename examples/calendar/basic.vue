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

const selected = shallowRef<DateValue>(new CalendarDate(2024, 6, 15))
const visibleMonth = new CalendarDate(2024, 6, 1)
const today = new CalendarDate(2024, 6, 10)
</script>

<template>
  <GhostCalendar
    v-model="selected"
    :default-visible-month="visibleMonth"
    :today="today"
    locale="en-US"
  >
    <GhostCalendarHeader>
      <GhostCalendarPrevButton />
      <GhostCalendarHeading />
      <GhostCalendarNextButton />
    </GhostCalendarHeader>
    <GhostCalendarGrid />
  </GhostCalendar>
</template>
