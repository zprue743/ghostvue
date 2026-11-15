<script setup lang="ts">
import { GhostCard } from '@ghostvue/vue'
</script>

<template>
  <GhostCard
    :effects="['spotlight']"
    class="demo-card"
    style="max-width: 24rem"
  >
    <template #header>
      <h2 style="margin: 0">Spotlight</h2>
    </template>
    Move the pointer to preview ambient tracking on this surface.
  </GhostCard>
</template>

<style scoped>
.demo-card {
  min-height: 8rem;
  padding: 1.25rem;
}
</style>
