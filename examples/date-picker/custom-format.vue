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
import type { GhostDatePickerFormat, GhostDatePickerParse } from '@ghostvue/vue'

const appointment = shallowRef<GhostDatePickerValue>(
  new CalendarDate(2026, 11, 24),
)
const today = new CalendarDate(2026, 11, 17)

const pad = (value: number, length = 2) => String(value).padStart(length, '0')

// Display as TT.MM.JJJJ. Form submission stays ISO YYYY-MM-DD.
const format: GhostDatePickerFormat = (date) =>
  `${pad(date.day)}.${pad(date.month)}.${pad(date.year, 4)}`

const parse: GhostDatePickerParse = (text) => {
  const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(text)
  if (!match) return null
  const [day, month, year] = [match[1], match[2], match[3]].map(Number)
  if (!day || !month || !year || month > 12) return null
  const date = new CalendarDate(year, month, day)
  // CalendarDate constrains overflow (31.02 becomes 28.02); reject that.
  return date.day === day ? date : null
}
</script>

<template>
  <div class="ghost-theme date-picker-format" lang="de">
    <label for="date-picker-format-appointment">Termin</label>
    <span class="date-picker-format__row">
      <GhostDatePicker
        v-model="appointment"
        locale="de-DE"
        format-hint="TT.MM.JJJJ"
        :today="today"
        :parse="parse"
        :format="format"
        :validation-message="
          (error) =>
            error.code === 'parse'
              ? 'Datum als TT.MM.JJJJ eingeben'
              : error.message
        "
        name="termin"
      >
        <GhostDatePickerInput id="date-picker-format-appointment" />
        <GhostDatePickerTrigger aria-label="Datum wählen" />
        <GhostDatePickerContent
          aria-label="Datum wählen"
          close-label="Kalender schließen"
        />
      </GhostDatePicker>
    </span>
  </div>
</template>

<style scoped>
.date-picker-format {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.date-picker-format__row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}
</style>
