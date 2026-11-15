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

const selected = shallowRef<DateValue>(new CalendarDate(2024, 6, 3))
const visibleMonth = new CalendarDate(2024, 6, 1)
const today = new CalendarDate(2024, 6, 3)
</script>

<template>
  <GhostCalendar
    v-model="selected"
    locale="de-DE"
    :week-starts-on="1"
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
