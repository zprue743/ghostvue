<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/vue'

const fruit = ref('banana')
</script>

<template>
  <GhostSelect
    v-model="fruit"
    placeholder="Pick a fruit"
    data-testid="select-basic"
  >
    <GhostSelectTrigger
      data-testid="select-basic-trigger"
      aria-label="Pick a fruit"
    >
      <GhostSelectValue />
    </GhostSelectTrigger>
    <GhostSelectContent :offset="6" data-testid="select-basic-content">
      <GhostSelectOption value="apple">Apple</GhostSelectOption>
      <GhostSelectOption value="banana">Banana</GhostSelectOption>
      <GhostSelectOption value="orange">Orange</GhostSelectOption>
    </GhostSelectContent>
  </GhostSelect>
</template>
