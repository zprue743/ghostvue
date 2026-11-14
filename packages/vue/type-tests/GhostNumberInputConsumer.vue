<script setup lang="ts">
import GhostNumberInput from '../src/GhostNumberInput.vue'
</script>

<template>
  <GhostNumberInput
    aria-label="Units"
    name="units"
    :max="99"
    :min="0"
    :step="1"
  />
</template>
