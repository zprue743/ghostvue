<script setup lang="ts">
import { computed, onMounted, shallowRef } from 'vue'

import type { GhostPortalTarget } from './ghost-portal'

// Declared inline so vue-component-meta extracts prop types and defaults cleanly.
const props = withDefaults(
  defineProps<{
    /** Target CSS selector or DOM element to teleport children into. */
    to?: GhostPortalTarget
    /** Render slot content inline instead of teleporting. */
    disabled?: boolean
    /** Defer target lookup until after the current mount or update cycle. */
    defer?: boolean
  }>(),
  {
    to: 'body',
    disabled: false,
    defer: false,
  },
)

// Keep SSR and initial hydration inline until mount so Teleport never touches
// document during SSR setup or depends on ssrContext.teleports.
const mounted = shallowRef(false)

onMounted(() => {
  mounted.value = true
})

const teleportDisabled = computed(
  () => props.disabled || !mounted.value || props.to == null,
)
const teleportTarget = computed(() => props.to ?? 'body')
</script>

<template>
  <Teleport :to="teleportTarget" :disabled="teleportDisabled" :defer="defer">
    <slot />
  </Teleport>
</template>
