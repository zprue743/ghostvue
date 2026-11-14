<script setup lang="ts">
import { ref } from 'vue'

import { GhostPagination } from '@ghostvue/vue'

const page = ref(15)
</script>

<template>
  <GhostPagination
    v-model="page"
    :page-count="40"
    :sibling-count="1"
    :boundary-count="1"
    aria-label="Long catalog"
    class="example-pagination"
  />
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
</style>
