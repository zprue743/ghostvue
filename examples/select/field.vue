<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/vue'

const operator = ref<string | undefined>(undefined)
</script>

<template>
  <GhostField required>
    <GhostFieldLabel>Filter operator</GhostFieldLabel>
    <GhostFieldDescription>How values are compared.</GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostSelect v-model="operator">
        <GhostSelectTrigger v-bind="field">
          <GhostSelectValue placeholder="Choose operator" />
        </GhostSelectTrigger>
        <GhostSelectContent :portal="false">
          <GhostSelectOption value="eq">Equals</GhostSelectOption>
          <GhostSelectOption value="contains">Contains</GhostSelectOption>
          <GhostSelectOption value="starts">Starts with</GhostSelectOption>
        </GhostSelectContent>
      </GhostSelect>
    </GhostFieldControl>
  </GhostField>
</template>
