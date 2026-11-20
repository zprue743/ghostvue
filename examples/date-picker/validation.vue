<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  type GhostDatePickerRange,
} from '@ghostvue/vue'

const today = new CalendarDate(2026, 11, 17)
const maxNights = 14
const booked = new Set(['2026-11-25', '2026-11-26'])

function isBooked(date: CalendarDate): boolean {
  return booked.has(date.toString())
}

// The picker checks endpoints only. Reject booked nights inside the range
// here, after capping the length so the scan stays bounded.
function validateStay(range: GhostDatePickerRange): string | null {
  const nights = range.end.compare(range.start)
  if (nights > maxNights) {
    return `Stays are limited to ${String(maxNights)} nights`
  }
  for (let offset = 0; offset <= nights; offset += 1) {
    if (isBooked(range.start.add({ days: offset }))) {
      return 'This stay includes booked nights'
    }
  }
  return null
}

const submitted = shallowRef('')

function onSubmit(event: Event): void {
  if (event.target instanceof HTMLFormElement) {
    const data = new FormData(event.target)
    const field = (name: string) => {
      const value = data.get(name)
      return typeof value === 'string' ? value : ''
    }
    submitted.value = `${field('stay[start]')} to ${field('stay[end]')}`
  }
}
</script>

<template>
  <form class="date-picker-validation" @submit.prevent="onSubmit">
    <div
      class="date-picker-validation__group"
      role="group"
      aria-labelledby="date-picker-validation-legend"
    >
      <span id="date-picker-validation-legend">Stay (required)</span>
      <GhostDatePicker
        v-slot="{ errors }"
        selection-mode="range"
        name="stay"
        required
        :today="today"
        :min-value="today"
        :is-date-disabled="isBooked"
        :validate-range="validateStay"
      >
        <span class="date-picker-validation__row">
          <label for="date-picker-validation-start">Check-in</label>
          <GhostDatePickerInput
            id="date-picker-validation-start"
            part="start"
          />
          <label for="date-picker-validation-end">Check-out</label>
          <GhostDatePickerInput id="date-picker-validation-end" part="end" />
          <GhostDatePickerTrigger />
        </span>
        <GhostDatePickerContent />
        <ul v-if="errors.length > 0" class="date-picker-validation__errors">
          <li v-for="error in errors" :key="`${error.part}-${error.code}`">
            {{ error.message }}
          </li>
        </ul>
      </GhostDatePicker>
    </div>
    <span class="date-picker-validation__row">
      <button type="submit">Book</button>
      <button type="reset">Reset</button>
    </span>
    <output>{{ submitted || 'Not submitted' }}</output>
  </form>
</template>

<style scoped>
.date-picker-validation {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.date-picker-validation__group {
  display: grid;
  gap: 0.25rem;
}

.date-picker-validation__row {
  align-items: center;
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.date-picker-validation__errors {
  margin: 0;
  padding-inline-start: 1.25rem;
}
</style>
