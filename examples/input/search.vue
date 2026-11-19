<script setup lang="ts">
import { ref } from 'vue'

import { GhostInput, type GhostInputSize } from '@ghostvue/themes'

/*
 * Optional so the sample runs as-is; the docs props playground passes them
 * to try other states. The defaults (`md`, and Vue's `false` for absent
 * booleans) are what this sample renders.
 */
const {
  size = 'md',
  disabled,
  invalid,
} = defineProps<{
  size?: GhostInputSize
  disabled?: boolean
  invalid?: boolean
}>()

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
      :size
      :disabled
      :invalid
    />
  </label>
  <p>Query: {{ query || '(empty)' }}</p>
</template>
