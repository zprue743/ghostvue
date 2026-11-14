<script setup lang="ts">
import { ref } from 'vue'

import { GhostInput } from '@ghostvue/themes'

const query = ref('')
</script>

<template>
  <label>
    Search reports
    <GhostInput
      v-model="query"
      type="search"
      name="q"
      placeholder="Forecast"
      block
    />
  </label>
  <p>Query: {{ query || '(empty)' }}</p>
</template>
