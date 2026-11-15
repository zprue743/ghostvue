<script setup lang="ts">
import { CalendarDate, type DateValue } from '@ghostvue/themes'
import { shallowRef } from 'vue'

import {
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
} from '@ghostvue/themes'

import '@ghostvue/themes/default.css'

const selected = shallowRef<DateValue>(new CalendarDate(2024, 6, 18))
const visibleMonth = new CalendarDate(2024, 6, 1)
const today = new CalendarDate(2024, 6, 18)
</script>

<template>
  <div class="ghost-theme" style="max-width: 20rem; padding: 1rem">
    <GhostCalendar
      v-model="selected"
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
  </div>
</template>
