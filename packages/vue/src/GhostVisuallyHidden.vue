<script setup lang="ts">
import type { GhostVisuallyHiddenProps } from './ghost-visually-hidden'
import { useGhostVisuallyHidden } from './use-ghost-visually-hidden'

const props = withDefaults(defineProps<GhostVisuallyHiddenProps>(), {
  as: 'span',
  focusable: false,
})

// Template comments become nodes in development and break single-root fallthrough.
const { rootProps } = useGhostVisuallyHidden({
  focusable: () => props.focusable,
})
</script>

<template>
  <component :is="as" v-bind="rootProps">
    <slot />
  </component>
</template>
