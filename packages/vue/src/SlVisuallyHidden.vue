<script setup lang="ts">
import type { SlVisuallyHiddenProps } from './sl-visually-hidden'
import { useSlVisuallyHidden } from './use-sl-visually-hidden'

const props = withDefaults(defineProps<SlVisuallyHiddenProps>(), {
  as: 'span',
  focusable: false,
})

// Listeners live on rootProps. Template comments become real nodes in
// development and would break the single-root fallthrough this API needs.
const { rootProps } = useSlVisuallyHidden({
  focusable: () => props.focusable,
})
</script>

<template>
  <component :is="as" v-bind="rootProps">
    <slot />
  </component>
</template>
