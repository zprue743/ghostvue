<script setup lang="ts">
import { ref } from 'vue'

import { GhostToggleGroup, GhostToggleGroupItem } from '@ghostvue/vue'

const density = ref('comfortable')
</script>

<template>
  <GhostToggleGroup v-model="density" aria-label="Row density">
    <GhostToggleGroupItem value="compact">Compact</GhostToggleGroupItem>
    <GhostToggleGroupItem value="comfortable">Comfortable</GhostToggleGroupItem>
    <GhostToggleGroupItem value="spacious">Spacious</GhostToggleGroupItem>
  </GhostToggleGroup>
</template>
