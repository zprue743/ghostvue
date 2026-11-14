<script setup lang="ts">
import { ref } from 'vue'

import { GhostPagination } from '@ghostvue/vue'

const page = ref(2)
</script>

<template>
  <GhostPagination
    v-model="page"
    :page-count="12"
    aria-label="Result pages"
    class="example-pagination"
  />
  <p class="example-status">Active page: {{ page }}</p>
</template>

<style scoped>
.example-pagination :deep(.ghost-pagination__list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.example-pagination :deep(button) {
  appearance: none;
  background: Canvas;
  border: 1px solid GrayText;
  border-radius: 0.25rem;
  color: CanvasText;
  cursor: pointer;
  min-inline-size: 2rem;
  padding: 0.25rem 0.5rem;
}

.example-pagination :deep(button[aria-current='page']) {
  background: Highlight;
  color: HighlightText;
}
</style>
