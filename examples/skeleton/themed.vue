<script setup lang="ts">
import { GhostSkeleton } from '@ghostvue/themes'
</script>

<template>
  <div class="skeleton-themed-example">
    <GhostSkeleton class="skeleton-themed-example__line" />
    <GhostSkeleton shape="rect" class="skeleton-themed-example__rect" />
    <GhostSkeleton shape="circle" />
  </div>
</template>

<style scoped>
.skeleton-themed-example {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}

.skeleton-themed-example__line,
.skeleton-themed-example__rect {
  inline-size: min(100%, 12rem);
}
</style>
