<script setup lang="ts">
import type { SlVisuallyHiddenProps } from './sl-visually-hidden'
import { useSlVisuallyHidden } from './use-sl-visually-hidden'

const props = withDefaults(defineProps<SlVisuallyHiddenProps>(), {
  as: 'span',
  focusable: false,
})

// Template comments become nodes in development and break single-root fallthrough.
const { rootProps } = useSlVisuallyHidden({
  focusable: () => props.focusable,
})
</script>

<template>
  <component :is="as" v-bind="rootProps">
    <slot />
  </component>
</template>
