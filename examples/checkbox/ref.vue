<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostCheckbox, type GhostCheckboxExposed } from '@ghostvue/vue'

const checkbox = useTemplateRef<GhostCheckboxExposed>('checkbox')

function focusCheckbox(): void {
  checkbox.value?.focus()
}
</script>

<template>
  <div class="stack">
    <label for="notify">
      <GhostCheckbox id="notify" ref="checkbox" />
      Email me about launches
    </label>
    <button type="button" @click="focusCheckbox">Move focus to checkbox</button>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

label {
  align-items: center;
  display: flex;
  gap: 0.5rem;
}
</style>
