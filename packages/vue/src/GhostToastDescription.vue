<script setup lang="ts">
/** Optional supporting copy of a toast. */
import { computed, inject, mergeProps, useAttrs, useTemplateRef } from 'vue'

import {
  ghostToastItemContextKey,
  type GhostToastDescriptionExposed,
} from './ghost-toast'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(): unknown
}>()

if (!inject(ghostToastItemContextKey, null)) {
  throw new Error('GhostToastDescription must be used inside GhostToast')
}

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')

const bindings = computed(() =>
  mergeProps(attrs, {
    class: 'ghost-toast-description',
    'data-part': 'description',
  }),
)

defineExpose<GhostToastDescriptionExposed>({
  get element() {
    return host.value
  },
})
</script>

<template>
  <div ref="host" v-bind="bindings">
    <slot />
  </div>
</template>
