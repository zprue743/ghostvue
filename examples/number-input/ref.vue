<script setup lang="ts">
import { ref, useTemplateRef } from 'vue'

import { GhostNumberInput, type GhostNumberInputExposed } from '@ghostvue/vue'

const control = useTemplateRef<GhostNumberInputExposed>('control')
const value = ref(10)

function bump(): void {
  control.value?.increment()
}
</script>

<template>
  <label for="editable-score">Editable score</label>
  <GhostNumberInput
    id="editable-score"
    ref="control"
    v-model="value"
    :min="0"
    :max="100"
    name="score"
  />
  <button type="button" @click="bump">Increment score</button>
  <p>Score: {{ value }}</p>
</template>
