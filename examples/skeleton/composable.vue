<script setup lang="ts">
import { useGhostSkeleton } from '@ghostvue/vue'

const { rootProps } = useGhostSkeleton()
</script>

<template>
  <span
    v-bind="rootProps"
    style="display: inline-block; inline-size: 12rem; block-size: 1rem"
  />
</template>
