<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  GhostCalendar,
  GhostCalendarGrid,
  type CalendarDate,
  type GhostCalendarValue,
} from '../src'

// DatePicker-style adapter: Calendar stays controlled while empty and the
// parent owns its own anchor from `select`.
const display = shallowRef<CalendarDate | null>(null)
const anchor = shallowRef<CalendarDate | null>(null)

function onSelect(date: CalendarDate) {
  anchor.value = date
}

function onProposal(value: GhostCalendarValue) {
  void value
}
</script>

<template>
  <GhostCalendar
    :model-value="display"
    selection-mode="range"
    @select="onSelect"
    @update:model-value="onProposal"
  >
    <template #default="{ modelValue }">
      {{ modelValue?.toString() ?? 'empty' }}
      <GhostCalendarGrid />
    </template>
  </GhostCalendar>
</template>
