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

const due = shallowRef<GhostDatePickerValue>(null)
// An explicit `today` keeps SSR and the first client render identical.
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div class="date-picker-basic">
    <label for="date-picker-basic-due">Due date</label>
    <span class="date-picker-basic__row">
      <GhostDatePicker v-model="due" :today="today" name="due">
        <GhostDatePickerInput id="date-picker-basic-due" />
        <GhostDatePickerTrigger />
        <GhostDatePickerContent />
      </GhostDatePicker>
    </span>
    <output>
      {{ due instanceof CalendarDate ? due.toString() : 'No date' }}
    </output>
  </div>
</template>

<style scoped>
.date-picker-basic {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.date-picker-basic__row {
  display: inline-flex;
  gap: 0.25rem;
}
</style>
