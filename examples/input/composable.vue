<script setup lang="ts">
import { useGhostInput } from '@ghostvue/vue'

const { rootProps } = useGhostInput({ defaultValue: 'forecast' })
</script>

<template>
  <label>
    Filter
    <input v-bind="rootProps" />
  </label>
</template>
