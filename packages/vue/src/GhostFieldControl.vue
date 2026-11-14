<script setup lang="ts">
import { computed, inject } from 'vue'

import {
  ghostFieldContextKey,
  type GhostFieldControlExposed,
  type GhostFieldControlSlotProps,
} from './ghost-field'

const context = inject(ghostFieldContextKey)
if (!context) {
  throw new Error('GhostFieldControl must be used inside GhostField')
}

defineSlots<{
  default(props: GhostFieldControlSlotProps): unknown
}>()

const slotProps = computed((): GhostFieldControlSlotProps => {
  const describedBy = context.ariaDescribedBy.value
  const props: GhostFieldControlSlotProps = {
    id: context.controlId.value,
    disabled: context.disabled.value,
    invalid: context.invalid.value,
    required: context.required.value,
  }
  if (describedBy) {
    props['aria-describedby'] = describedBy
  }
  if (context.invalid.value) {
    props['aria-invalid'] = true
  }
  return props
})

defineExpose<GhostFieldControlExposed>({
  get element() {
    return null
  },
})
</script>

<template>
  <slot v-bind="slotProps" />
</template>
