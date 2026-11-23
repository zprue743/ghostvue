<script setup lang="ts">
/** Primary line of a toast. A plain `div`: the live region already announces it. */
import { computed, inject, mergeProps, useAttrs, useTemplateRef } from 'vue'

import {
  ghostToastItemContextKey,
  type GhostToastTitleExposed,
} from './ghost-toast'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{
  default(): unknown
}>()

if (!inject(ghostToastItemContextKey, null)) {
  throw new Error('GhostToastTitle must be used inside GhostToast')
}

const attrs = useAttrs()
const host = useTemplateRef<HTMLElement>('host')

const bindings = computed(() =>
  mergeProps(attrs, {
    class: 'ghost-toast-title',
    'data-part': 'title',
  }),
)

defineExpose<GhostToastTitleExposed>({
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
