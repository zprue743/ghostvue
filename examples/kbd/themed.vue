<script setup lang="ts">
import { GhostKbd } from '@ghostvue/themes'
</script>

<template>
  <div class="kbd-themed-example">
    <span>Save with</span>
    <GhostKbd :keys="['mod', 's']" platform="pc" />
    <span>or</span>
    <GhostKbd size="sm">Esc</GhostKbd>
    <span>to cancel.</span>
  </div>
</template>

<style scoped>
.kbd-themed-example {
  align-items: center;
  color: var(--ghost-text-default);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-normal);
}
</style>
