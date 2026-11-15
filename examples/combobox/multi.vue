<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/vue'

const tags = ref<string[]>(['vue'])
</script>

<template>
  <GhostCombobox v-model="tags" multiple>
    <GhostComboboxInput
      aria-label="Pick frameworks"
      placeholder="Add frameworks"
    />
    <GhostComboboxContent :portal="false">
      <GhostComboboxOption value="vue" text-value="Vue"
        >Vue</GhostComboboxOption
      >
      <GhostComboboxOption value="react" text-value="React"
        >React</GhostComboboxOption
      >
      <GhostComboboxOption value="svelte" text-value="Svelte"
        >Svelte</GhostComboboxOption
      >
    </GhostComboboxContent>
  </GhostCombobox>
</template>
