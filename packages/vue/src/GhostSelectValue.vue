<script setup lang="ts">
import { computed, inject } from 'vue'

import { ghostSelectContextKey, type GhostSelectContext } from './ghost-select'

const injected = inject(ghostSelectContextKey)
if (!injected) {
  throw new Error('GhostSelectValue must be used inside GhostSelect')
}
const context: GhostSelectContext = injected

const displayText = computed(() => {
  void context.optionOrder.value
  void context.selectedValue.value
  void context.labelVersion.value
  const value = context.selectedValue.value
  if (value === undefined) {
    return context.placeholder.value
  }
  return context.getOptionText(value) ?? value
})

const hasSelection = computed(() => context.selectedValue.value !== undefined)
</script>

<template>
  <span data-part="value" :data-state="hasSelection ? 'checked' : undefined">
    <slot v-if="hasSelection">{{ displayText }}</slot>
    <slot v-else name="placeholder">{{ displayText }}</slot>
  </span>
</template>
