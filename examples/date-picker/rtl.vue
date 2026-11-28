<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  type GhostDatePickerValue,
} from '@ghostvue/themes'

const date = shallowRef<GhostDatePickerValue>(new CalendarDate(2026, 11, 18))
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div class="ghost-theme date-picker-rtl" dir="rtl" lang="he">
    <label for="date-picker-rtl-date">תאריך</label>
    <span class="date-picker-rtl__row">
      <GhostDatePicker v-model="date" locale="he-IL" :today="today">
        <GhostDatePickerInput id="date-picker-rtl-date" dir="ltr" />
        <GhostDatePickerTrigger aria-label="בחירת תאריך" />
        <GhostDatePickerContent
          dir="rtl"
          aria-label="בחירת תאריך"
          close-label="סגירה"
        />
      </GhostDatePicker>
    </span>
  </div>
</template>

<style scoped>
.date-picker-rtl {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.date-picker-rtl__row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
