<script setup lang="ts">
import { ref } from 'vue'

import { GhostPagination } from '@ghostvue/vue'

const page = ref(1)
const pageCount = ref(6)
</script>

<template>
  <GhostPagination
    :model-value="page"
    :page-count="pageCount"
    aria-label="Controlled archives"
    @update:model-value="page = $event"
  />
  <p class="example-status">Selected index: {{ page }} / {{ pageCount }}</p>
</template>
