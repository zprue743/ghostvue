<script setup lang="ts">
import type { GhostSeparatorProps } from './ghost-separator'
import { useGhostSeparator } from './use-ghost-separator'

// No default slot: native `hr` is void, and role=separator makes descendants presentational.

const props = withDefaults(defineProps<GhostSeparatorProps>(), {
  decorative: false,
  orientation: 'horizontal',
})

const { as, rootProps } = useGhostSeparator({
  as: () => props.as,
  decorative: () => props.decorative,
  orientation: () => props.orientation,
})
</script>

<template>
  <component :is="as" v-bind="rootProps" />
</template>
