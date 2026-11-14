<script setup lang="ts">
import { GhostButton } from '@ghostvue/vue'
import { GhostEmptyState } from '@ghostvue/vue'
</script>

<template>
  <GhostEmptyState :heading-level="2">
    <template #title>No matching rows</template>
    <template #description>
      Nothing matches the current filters. Try clearing one or more constraints.
    </template>
    <template #actions>
      <GhostButton type="button" @click.prevent>Clear filters</GhostButton>
    </template>
  </GhostEmptyState>
</template>
