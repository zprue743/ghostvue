<script setup lang="ts">
import { GhostProgress } from '@ghostvue/themes'
</script>

<template>
  <div class="progress-stack">
    <GhostProgress label="Uploading report" :value="40" />
    <GhostProgress
      label="Compact export"
      size="sm"
      :value="70"
      value-text="7 of 10 sheets"
    />
    <GhostProgress
      label="Refreshing rows"
      size="lg"
      tone="neutral"
      :value="15"
    />
    <GhostProgress label="Deleting rows" tone="danger" />
  </div>
</template>

<style scoped>
.progress-stack {
  display: grid;
  gap: 1rem;
  /* Example previews are flex; shrink-wrap would collapse percentage fills to 0. */
  inline-size: min(100%, 24rem);
}
</style>
