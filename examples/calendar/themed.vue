<script setup lang="ts">
import { CalendarDate, type DateValue } from '@ghostvue/themes'
import { computed, shallowRef } from 'vue'

import {
  GhostButton,
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
  GhostCard,
} from '@ghostvue/themes'

const today = new CalendarDate(2024, 6, 18)
const selected = shallowRef<DateValue>(today)
const visibleMonth = shallowRef<CalendarDate>(new CalendarDate(2024, 6, 1))

const formattedSelected = computed(() => selected.value.toString())

function resetToToday(): void {
  selected.value = today
  visibleMonth.value = new CalendarDate(2024, 6, 1)
}
</script>

<template>
  <GhostCard class="release-calendar">
    <template #header>
      <div class="release-calendar__header">
        <span class="release-calendar__title">Release window</span>
        <GhostButton
          variant="ghost"
          tone="neutral"
          size="sm"
          @click="resetToToday"
        >
          Today
        </GhostButton>
      </div>
    </template>

    <GhostCalendar
      v-model="selected"
      v-model:visible-month="visibleMonth"
      :today="today"
    >
      <GhostCalendarHeader>
        <GhostCalendarPrevButton />
        <GhostCalendarHeading />
        <GhostCalendarNextButton />
      </GhostCalendarHeader>
      <GhostCalendarGrid />
    </GhostCalendar>

    <template #footer>
      <div class="release-calendar__status" role="status" aria-live="polite">
        Selected date: {{ formattedSelected }}
      </div>
    </template>
  </GhostCard>
</template>

<style scoped>
.release-calendar {
  inline-size: 100%;
  max-inline-size: 22rem;
}

.release-calendar__header {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.release-calendar__title {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
}

.release-calendar__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-variant-numeric: tabular-nums;
}
</style>
