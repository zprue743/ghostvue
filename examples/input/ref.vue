<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostInput, type GhostInputExposed } from '@ghostvue/vue'

const field = useTemplateRef<GhostInputExposed>('field')

function focusField(): void {
  field.value?.focus()
}
</script>

<template>
  <div class="stack">
    <label class="field">
      Jump to filter
      <GhostInput ref="field" name="jump" />
    </label>
    <button type="button" @click="focusField">Move focus to filter</button>
  </div>
</template>

<style scoped>
.stack {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}

.field {
  display: grid;
  gap: 0.25rem;
}
</style>
