<script setup lang="ts">
import { ref } from 'vue'

import { GhostNumberInput } from '@ghostvue/vue'

const quantity = ref(3)
</script>

<template>
  <label for="quantity">Quantity (clamped 1–9)</label>
  <GhostNumberInput
    id="quantity"
    v-model="quantity"
    :min="1"
    :max="9"
    name="quantity"
  />
</template>
