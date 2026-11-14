<script setup lang="ts">
import { ref } from 'vue'

import GhostPagination from '../src/GhostPagination.vue'

const page = ref(1)
</script>

<template>
  <GhostPagination v-model="page" :page-count="4" aria-label="Type fixture" />
</template>
