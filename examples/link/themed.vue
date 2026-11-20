<script setup lang="ts">
import { GhostLink } from '@ghostvue/themes'
</script>

<template>
  <div class="link-themed-example">
    <GhostLink href="/philosophy">Read the philosophy (inline)</GhostLink>
    <GhostLink href="/philosophy" variant="subtle">
      Read the philosophy (subtle)
    </GhostLink>
  </div>
</template>

<style scoped>
.link-themed-example {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: var(--ghost-space-gap-sm);
}
</style>
