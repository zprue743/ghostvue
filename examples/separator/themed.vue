<script setup lang="ts">
import { GhostButton, GhostSeparator } from '@ghostvue/themes'
</script>

<template>
  <div class="toolbar">
    <GhostButton size="sm">Cut</GhostButton>
    <GhostSeparator orientation="vertical" />
    <GhostButton size="sm">Copy</GhostButton>
    <GhostSeparator orientation="vertical" />
    <GhostButton size="sm" tone="danger">Delete</GhostButton>
  </div>
</template>

<style scoped>
.toolbar {
  align-items: stretch;
  display: flex;
  gap: var(--ghost-space-gap-sm);
}
</style>
