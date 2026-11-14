<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostNumberInput,
} from '@ghostvue/vue'

const filterMinimum = ref<number | null>(null)
</script>

<template>
  <GhostField>
    <GhostFieldLabel>Minimum amount</GhostFieldLabel>
    <GhostFieldDescription>
      Filter rows where the amount is at least this value.
    </GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostNumberInput
        v-bind="field"
        v-model="filterMinimum"
        :min="0"
        :step="0.01"
        :format-options="{ style: 'currency', currency: 'USD' }"
        locale="en-US"
        name="filter-minimum"
      />
    </GhostFieldControl>
  </GhostField>
  <p>Filter: {{ filterMinimum ?? 'none' }}</p>
</template>
