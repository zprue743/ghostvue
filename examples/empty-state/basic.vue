<script setup lang="ts">
import { GhostEmptyState } from '@ghostvue/vue'
</script>

<template>
  <GhostEmptyState :heading-level="2">
    <template #title>No reports yet</template>
    <template #description>
      Create a report to see revenue summaries here.
    </template>
  </GhostEmptyState>
</template>
