<script setup lang="ts">
import { ref } from 'vue'

import { GhostSlider } from '@ghostvue/vue'

const level = ref(60)
</script>

<template>
  <GhostSlider
    v-model="level"
    orientation="vertical"
    aria-label="Gain"
    :min="0"
    :max="100"
  />
  <!-- Fixed line-height avoids subpixel line-box drift in visual snapshots. -->
  <p style="margin: 0; line-height: var(--ghost-font-line-body, 1.25rem)">
    Level {{ level }}
  </p>
</template>
