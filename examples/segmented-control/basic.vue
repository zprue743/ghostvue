<script setup lang="ts">
import { ref } from 'vue'

import { GhostSegmentedControl, GhostSegmentedControlItem } from '@ghostvue/vue'

const view = ref('list')
</script>

<template>
  <GhostSegmentedControl v-model="view" aria-label="Content view">
    <GhostSegmentedControlItem value="list">List</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="grid">Grid</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="board">Board</GhostSegmentedControlItem>
  </GhostSegmentedControl>
</template>
