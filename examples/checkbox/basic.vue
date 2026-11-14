<script setup lang="ts">
import { ref } from 'vue'

import { GhostCheckbox } from '@ghostvue/vue'

const accepted = ref(false)
</script>

<template>
  <label>
    <GhostCheckbox v-model="accepted" name="tos" />
    Accept terms
  </label>
</template>

<style scoped>
label {
  align-items: center;
  display: inline-flex;
  gap: 0.5rem;
}
</style>
