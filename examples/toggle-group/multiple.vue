<script setup lang="ts">
import { ref } from 'vue'

import { GhostToggleGroup, GhostToggleGroupItem } from '@ghostvue/vue'

const formats = ref<string[]>(['bold'])
</script>

<template>
  <GhostToggleGroup
    v-model="formats"
    type="multiple"
    aria-label="Text formatting"
  >
    <GhostToggleGroupItem value="bold">Bold</GhostToggleGroupItem>
    <GhostToggleGroupItem value="italic">Italic</GhostToggleGroupItem>
    <GhostToggleGroupItem value="underline">Underline</GhostToggleGroupItem>
  </GhostToggleGroup>
</template>
