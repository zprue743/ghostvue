<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
  type GhostCalendarValue,
} from '@ghostvue/vue'

const range = shallowRef<GhostCalendarValue>({
  start: new CalendarDate(2024, 6, 10),
  end: new CalendarDate(2024, 6, 14),
})
const visibleMonth = new CalendarDate(2024, 6, 1)
const today = new CalendarDate(2024, 6, 12)
</script>

<template>
  <GhostCalendar
    v-model="range"
    selection-mode="range"
    :default-visible-month="visibleMonth"
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
