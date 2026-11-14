<script setup lang="ts">
import { ref } from 'vue'

import { GhostPagination } from '@ghostvue/themes'

const page = ref(3)
</script>

<template>
  <div class="ghost-theme">
    <GhostPagination
      v-model="page"
      :page-count="8"
      size="sm"
      aria-label="Themed invoices"
    />
  </div>
</template>
