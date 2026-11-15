<script setup lang="ts">
import { computed, inject } from 'vue'

import { ghostSegmentedControlContextKey } from './ghost-segmented-control'

const group = inject(ghostSegmentedControlContextKey)
if (!group) {
  throw new Error(
    'GhostSegmentedControlIndicator must be used inside GhostSegmentedControl',
  )
}

const indicatorAttrs = computed(() => {
  void group.registryVersion.value
  const visible = group.selectedIndex.value >= 0
  return {
    class: 'ghost-segmented-control-indicator',
    'data-part': 'indicator',
    'aria-hidden': true as const,
    'data-indicator-visible': visible ? 'true' : 'false',
    style: {
      '--ghost-segmented-item-count': String(
        Math.max(group.itemCount.value, 1),
      ),
      '--ghost-segmented-selected-index': String(group.selectedIndex.value),
    },
  }
})
</script>

<template>
  <div v-bind="indicatorAttrs" />
</template>
