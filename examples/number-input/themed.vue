<script setup lang="ts">
import { ref } from 'vue'

import { GhostNumberInput } from '@ghostvue/themes'

const offset = ref(0)
</script>

<template>
  <label for="pagination-offset">Pagination offset</label>
  <GhostNumberInput
    id="pagination-offset"
    v-model="offset"
    :min="0"
    :step="10"
    size="lg"
    block
    name="offset"
  />
</template>
