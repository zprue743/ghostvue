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
      <span class="release-calendar__title">Release window</span>
    </template>

    <GhostCalendar
      v-model="selected"
      v-model:visible-month="visibleMonth"
      :today="today"
    >
      <!--
        Today sits in the navigation group with the chevron buttons, so the
        month title, jump-to-today, and previous/next read as one toolbar row.
      -->
      <GhostCalendarHeader class="release-calendar__nav">
        <GhostCalendarHeading />
        <GhostButton
          variant="outline"
          tone="neutral"
          size="sm"
          @click="resetToToday"
        >
          Today
        </GhostButton>
        <GhostCalendarPrevButton />
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

.release-calendar__title {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
}

.release-calendar__nav :deep(.ghost-calendar-heading) {
  text-align: start;
}

.release-calendar__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-variant-numeric: tabular-nums;
}
</style>
