<script setup lang="ts">
import { GhostScrollArea } from '@ghostvue/vue'
</script>

<template>
  <GhostScrollArea
    label="Column preview"
    orientation="horizontal"
    style="max-inline-size: 16rem"
    data-testid="scroll-area-horizontal"
  >
    <div class="scroll-area-wide-table" role="presentation">
      <span v-for="column in 12" :key="column">Column {{ column }}</span>
    </div>
  </GhostScrollArea>
</template>

<style scoped>
.scroll-area-wide-table {
  display: flex;
  gap: 1.5rem;
  inline-size: max-content;
  padding-block: 0.25rem;
}
</style>
