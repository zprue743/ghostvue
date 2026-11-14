<script setup lang="ts">
import { ref } from 'vue'

import { GhostSlider } from '@ghostvue/vue'

const amount = ref(35)
</script>

<template>
  <GhostSlider
    v-model="amount"
    aria-label="Donation amount slider"
    :min="0"
    :max="100"
    :step="5"
  />
  <p>{{ amount }} credits</p>
</template>
