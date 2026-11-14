<script setup lang="ts">
import { GhostVisuallyHidden, useGhostSpinner } from '@ghostvue/vue'

const { label, rootProps } = useGhostSpinner()
</script>

<template>
  <span v-bind="rootProps">
    <GhostVisuallyHidden>{{ label }}</GhostVisuallyHidden>
  </span>
</template>
