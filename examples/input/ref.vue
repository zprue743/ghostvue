<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostInput, type GhostInputExposed } from '@ghostvue/vue'

const field = useTemplateRef<GhostInputExposed>('field')

function focusField(): void {
  field.value?.focus()
}
</script>

<template>
  <label>
    Jump to filter
    <GhostInput ref="field" name="jump" />
  </label>
  <button type="button" @click="focusField">Move focus to filter</button>
</template>
