<script setup lang="ts">
import { GhostAvatar } from '@ghostvue/themes'
</script>

<template>
  <div class="avatar-themed-example">
    <GhostAvatar size="sm" name="Ava Kim" />
    <GhostAvatar name="Ben Ortiz" />
    <GhostAvatar size="lg" name="Cara Ngo" />
  </div>
</template>

<style scoped>
.avatar-themed-example {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}
</style>
