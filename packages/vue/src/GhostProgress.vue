<script setup lang="ts">
import { useGhostProgress } from './use-ghost-progress'

// Declared props only; native HTML/ARIA stay fallthrough so the generator omits them.
// No default slot: progressbar children are presentational; the fill is data-part.
const props = withDefaults(
  defineProps<{
    value?: number | null
    max?: number
    label?: string
    valueText?: string
  }>(),
  {
    max: 100,
  },
)

const { rootProps, indicatorProps } = useGhostProgress({
  value: () => props.value,
  max: () => props.max,
  label: () => props.label,
  valueText: () => props.valueText,
})
</script>

<template>
  <div v-bind="rootProps">
    <div v-bind="indicatorProps" />
  </div>
</template>
