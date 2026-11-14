<script setup lang="ts">
import { GhostSpinner } from '@ghostvue/themes'
</script>

<template>
  <p class="spinner-row">
    <GhostSpinner />
    <GhostSpinner size="sm" label="Loading compact" />
    <GhostSpinner size="lg" tone="neutral" label="Loading spacious" />
    <GhostSpinner tone="danger" label="Deleting rows" />
  </p>
</template>

<style scoped>
.spinner-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
</style>
