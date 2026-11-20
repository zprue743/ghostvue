<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  type GhostDatePickerValue,
} from '@ghostvue/vue'

const stay = shallowRef<GhostDatePickerValue>({
  start: new CalendarDate(2026, 11, 20),
  end: new CalendarDate(2026, 11, 23),
})
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div
    class="date-picker-range"
    role="group"
    aria-labelledby="date-picker-range-legend"
  >
    <span id="date-picker-range-legend">Stay dates</span>
    <GhostDatePicker
      v-model="stay"
      selection-mode="range"
      :today="today"
      name="stay"
    >
      <label for="date-picker-range-start">Start date</label>
      <GhostDatePickerInput id="date-picker-range-start" part="start" />
      <label for="date-picker-range-end">End date</label>
      <GhostDatePickerInput id="date-picker-range-end" part="end" />
      <GhostDatePickerTrigger />
      <GhostDatePickerContent />
    </GhostDatePicker>
  </div>
</template>

<style scoped>
.date-picker-range {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

#date-picker-range-legend {
  flex-basis: 100%;
  font-weight: 600;
}
</style>
