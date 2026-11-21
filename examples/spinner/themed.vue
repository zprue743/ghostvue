<script setup lang="ts">
import { GhostSpinner } from '@ghostvue/themes'
</script>

<template>
  <div class="spinner-row">
    <GhostSpinner />
    <GhostSpinner size="sm" label="Loading compact" />
    <GhostSpinner size="lg" tone="neutral" label="Loading spacious" />
    <GhostSpinner tone="danger" label="Deleting rows" />
  </div>
</template>

<style scoped>
.spinner-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-md);
}
</style>
