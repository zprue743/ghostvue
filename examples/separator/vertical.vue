<script setup lang="ts">
import { GhostSeparator } from '@ghostvue/vue'
</script>

<template>
  <div class="row">
    <span>Cut</span>
    <GhostSeparator orientation="vertical" />
    <span>Copy</span>
  </div>
</template>

<style scoped>
.row {
  align-items: stretch;
  display: flex;
  gap: 0.75rem;
  min-block-size: 2.75rem;
}
</style>
