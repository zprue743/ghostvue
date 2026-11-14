<script setup lang="ts">
import { ref } from 'vue'

import { GhostNumberInput } from '@ghostvue/vue'

const pageSize = ref(25)
</script>

<template>
  <label for="page-size">Rows per page</label>
  <GhostNumberInput
    id="page-size"
    v-model="pageSize"
    :min="5"
    :max="100"
    :step="5"
    name="page-size"
  />
  <p>Current page size: {{ pageSize }}</p>
</template>
