<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostTableCaptionExposed } from './ghost-table'
import { useGhostTableCaption } from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableCaptionElement>('element')
const { rootProps } = useGhostTableCaption()

const mergedAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
}))

defineExpose<GhostTableCaptionExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <caption ref="element" v-bind="mergedAttrs">
    <slot />
  </caption>
</template>
