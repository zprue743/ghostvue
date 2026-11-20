<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  type GhostDatePickerValue,
} from '@ghostvue/themes'

const trip = shallowRef<GhostDatePickerValue>({
  start: new CalendarDate(2026, 12, 4),
  end: new CalendarDate(2026, 12, 8),
})
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div class="ghost-theme date-picker-themed">
    <div
      class="date-picker-themed__group"
      role="group"
      aria-labelledby="date-picker-themed-legend"
    >
      <span id="date-picker-themed-legend" class="date-picker-themed__legend">
        Trip dates
      </span>
      <GhostDatePicker
        v-model="trip"
        selection-mode="range"
        :today="today"
        name="trip"
      >
        <GhostField>
          <GhostFieldLabel>Departure</GhostFieldLabel>
          <GhostFieldControl v-slot="field">
            <GhostDatePickerInput v-bind="field" part="start" />
          </GhostFieldControl>
        </GhostField>
        <GhostField>
          <GhostFieldLabel>Return</GhostFieldLabel>
          <GhostFieldControl v-slot="field">
            <GhostDatePickerInput v-bind="field" part="end" />
          </GhostFieldControl>
        </GhostField>
        <GhostDatePickerTrigger class="date-picker-themed__trigger" />
        <GhostDatePickerContent />
      </GhostDatePicker>
    </div>
  </div>
</template>

<style scoped>
.date-picker-themed__group {
  align-items: end;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}

.date-picker-themed__legend {
  flex-basis: 100%;
  font-weight: var(--ghost-type-weight-semibold);
}
</style>
