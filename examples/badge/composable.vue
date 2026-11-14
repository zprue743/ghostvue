<script setup lang="ts">
import { useGhostBadge } from '@ghostvue/vue'

const { rootProps } = useGhostBadge()
</script>

<template>
  <span v-bind="rootProps">Draft</span>
</template>
