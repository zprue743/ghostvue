<script setup lang="ts">
import { useGhostScrollArea } from '@ghostvue/vue'
import { ref } from 'vue'

const element = ref<HTMLElement | null>(null)
const { rootProps } = useGhostScrollArea(
  {
    label: 'Composable scroll region',
    orientation: 'vertical',
  },
  element,
)
</script>

<template>
  <div
    ref="element"
    v-bind="rootProps"
    style="max-block-size: 6rem"
    data-testid="scroll-area-composable"
  >
    <p v-for="line in 8" :key="line">Line {{ line }}</p>
  </div>
</template>
