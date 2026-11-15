<script setup lang="ts">
import {
  CalendarDate,
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
} from '@ghostvue/vue'

const visibleMonth = new CalendarDate(2024, 6, 1)
const today = new CalendarDate(2024, 6, 10)
</script>

<template>
  <GhostCalendar :default-visible-month="visibleMonth" :today="today">
    <GhostCalendarHeader>
      <GhostCalendarPrevButton />
      <GhostCalendarHeading />
      <GhostCalendarNextButton />
    </GhostCalendarHeader>
    <GhostCalendarGrid />
  </GhostCalendar>
</template>
