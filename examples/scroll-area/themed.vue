<script setup lang="ts">
import { GhostScrollArea } from '@ghostvue/themes'
</script>

<template>
  <div class="scroll-area-themed-example">
    <GhostScrollArea
      label="Inbox"
      class="scroll-area-themed-example__box"
      data-testid="scroll-area-themed"
    >
      <ul class="scroll-area-themed-example__list">
        <li v-for="index in 10" :key="index">Message {{ index }}</li>
      </ul>
    </GhostScrollArea>
  </div>
</template>

<style scoped>
.scroll-area-themed-example {
  display: grid;
}

.scroll-area-themed-example__box {
  max-block-size: 8rem;
  max-inline-size: 20rem;
}

.scroll-area-themed-example__list {
  color: var(--ghost-text-default);
  display: grid;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  list-style: none;
  margin: 0;
  padding: 0;
}
</style>
