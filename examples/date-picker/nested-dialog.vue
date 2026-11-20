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
} from '@ghostvue/vue'

const reminder = shallowRef<GhostDatePickerValue>(null)
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <GhostDialog>
    <GhostDialogTrigger>Schedule reminder</GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent>
      <GhostDialogTitle>Schedule reminder</GhostDialogTitle>
      <label for="date-picker-nested-date">Remind me on</label>
      <GhostDatePicker v-model="reminder" :today="today">
        <GhostDatePickerInput id="date-picker-nested-date" />
        <GhostDatePickerTrigger />
        <GhostDatePickerContent />
      </GhostDatePicker>
      <GhostDialogClose>Done</GhostDialogClose>
    </GhostDialogContent>
  </GhostDialog>
</template>
