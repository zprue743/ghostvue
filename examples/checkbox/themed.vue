<script setup lang="ts">
import { ref } from 'vue'

import { GhostCheckbox } from '@ghostvue/themes'

const newsletter = ref(true)
const danger = ref(false)
const mixed = ref(false)
</script>

<template>
  <div class="stack">
    <label>
      <GhostCheckbox v-model="newsletter" size="sm" tone="neutral" />
      Weekly digest
    </label>
    <label>
      <GhostCheckbox v-model="danger" tone="danger" size="lg" />
      Delete associated files
    </label>
    <label>
      <GhostCheckbox v-model="mixed" indeterminate />
      Some rows selected
    </label>
    <label>
      <GhostCheckbox disabled default-value />
      Billing contact (locked)
    </label>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  justify-items: start;
}

label {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
}
</style>
