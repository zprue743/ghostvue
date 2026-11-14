<script setup lang="ts">
import { ref } from 'vue'

import { GhostSlider } from '@ghostvue/vue'

const bounds = ref<readonly [number, number]>([25, 75])
</script>

<template>
  <GhostSlider
    v-model="bounds"
    range
    aria-label="Score interval"
    :min="0"
    :max="100"
    :step="5"
  />
  <p>From {{ bounds[0] }} to {{ bounds[1] }}</p>
</template>
