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

/* Headless path ships no visuals; consumer CSS draws the rule. */
.ghost-separator {
  border-inline-start: 1px solid GrayText;
}
</style>
