<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/vue'

const fruit = ref('banana')
</script>

<template>
  <GhostCombobox v-model="fruit" data-testid="combobox-basic">
    <GhostComboboxInput
      data-testid="combobox-basic-input"
      aria-label="Pick a fruit"
      placeholder="Type to search fruits"
    />
    <GhostComboboxContent :offset="6" data-testid="combobox-basic-content">
      <GhostComboboxOption value="apple" text-value="Apple"
        >Apple</GhostComboboxOption
      >
      <GhostComboboxOption value="banana" text-value="Banana"
        >Banana</GhostComboboxOption
      >
      <GhostComboboxOption value="orange" text-value="Orange"
        >Orange</GhostComboboxOption
      >
    </GhostComboboxContent>
  </GhostCombobox>
</template>
