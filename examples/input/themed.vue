<script setup lang="ts">
import { GhostInput } from '@ghostvue/themes'
</script>

<template>
  <div class="sizes">
    <label>
      Small
      <GhostInput size="sm" placeholder="sm" />
    </label>
    <label>
      Medium
      <GhostInput placeholder="md" />
    </label>
    <label>
      Large
      <GhostInput size="lg" placeholder="lg" />
    </label>
  </div>
</template>

<style scoped>
.sizes {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}
</style>
