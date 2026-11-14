<script setup lang="ts">
import { useGhostAvatar } from '@ghostvue/vue'

const { rootProps } = useGhostAvatar({ name: 'Sam Lee' })
</script>

<template>
  <span v-bind="rootProps">
    <span data-part="fallback">SL</span>
  </span>
</template>
