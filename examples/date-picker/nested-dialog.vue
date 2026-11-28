<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  type GhostDatePickerValue,
} from '@ghostvue/themes'

const reminder = shallowRef<GhostDatePickerValue>(null)
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div class="ghost-theme">
    <GhostDialog>
      <GhostDialogTrigger>Schedule reminder</GhostDialogTrigger>
      <GhostDialogOverlay />
      <GhostDialogContent>
        <GhostDialogTitle>Schedule reminder</GhostDialogTitle>
        <label for="date-picker-nested-date">Remind me on</label>
        <span class="reminder-dialog__row">
          <GhostDatePicker v-model="reminder" :today="today">
            <GhostDatePickerInput id="date-picker-nested-date" />
            <GhostDatePickerTrigger />
            <GhostDatePickerContent class="reminder-dialog__picker" />
          </GhostDatePicker>
        </span>
        <GhostDialogClose class="reminder-dialog__done">
          Done
        </GhostDialogClose>
      </GhostDialogContent>
    </GhostDialog>
  </div>
</template>

<style scoped>
.reminder-dialog__row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}

.reminder-dialog__done {
  justify-self: end;
}
</style>

<style>
/* Leave room above or below the centered dialog’s input for the portaled calendar. */
.reminder-dialog__picker {
  max-block-size: calc(50dvh - 2rem);
}
</style>
