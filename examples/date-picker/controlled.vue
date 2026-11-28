<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostButton,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  type GhostDatePickerValue,
} from '@ghostvue/themes'

const launch = shallowRef<GhostDatePickerValue>(new CalendarDate(2026, 12, 1))
const open = shallowRef(false)
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div class="ghost-theme date-picker-controlled">
    <label for="date-picker-controlled-launch">Launch date</label>
    <GhostDatePicker
      v-slot="{ clear, pending }"
      v-model="launch"
      v-model:open="open"
      :today="today"
    >
      <span class="date-picker-controlled__row">
        <GhostDatePickerInput id="date-picker-controlled-launch" />
        <GhostDatePickerTrigger />
        <GhostButton type="button" @click="clear">Clear</GhostButton>
      </span>
      <GhostDatePickerContent />
      <p>
        Calendar {{ open ? 'open' : 'closed'
        }}{{ pending ? ', unsaved text' : '' }}
      </p>
    </GhostDatePicker>
    <output>
      {{ launch instanceof CalendarDate ? launch.toString() : 'No date' }}
    </output>
  </div>
</template>

<style scoped>
.date-picker-controlled {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.date-picker-controlled__row {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.date-picker-controlled p {
  margin: 0;
}
</style>
