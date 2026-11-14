<script setup lang="ts">
import { ref } from 'vue'

import { GhostSlider } from '@ghostvue/vue'

const score = ref(72)
</script>

<template>
  <GhostSlider
    v-model="score"
    aria-label="Match quality"
    :min="0"
    :max="100"
    value-text="72 percent match"
  />
</template>
