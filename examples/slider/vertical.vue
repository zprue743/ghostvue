<script setup lang="ts">
import { ref } from 'vue'

import { GhostSlider } from '@ghostvue/themes'

const level = ref(60)
</script>

<template>
  <div class="ghost-theme" style="display: inline-block; padding: 1rem">
    <GhostSlider
      v-model="level"
      orientation="vertical"
      aria-label="Gain"
      :min="0"
      :max="100"
    />
  </div>
  <p>Level {{ level }}</p>
</template>
