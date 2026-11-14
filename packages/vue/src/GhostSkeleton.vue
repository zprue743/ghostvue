<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import type { GhostSkeletonProps } from './ghost-skeleton'
import { useGhostSkeleton } from './use-ghost-skeleton'

defineOptions({
  // Attrs are merged under rootProps so aria-hidden and inert cannot be unset.
  inheritAttrs: false,
})

withDefaults(defineProps<GhostSkeletonProps>(), {
  as: 'span',
})

const attrs = useAttrs()
// Template comments become nodes in development and break single-root fallthrough.
const { rootProps } = useGhostSkeleton()

const hostAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
  class: [attrs.class, rootProps.value.class],
}))
</script>

<template>
  <component :is="as" v-bind="hostAttrs">
    <slot />
  </component>
</template>
