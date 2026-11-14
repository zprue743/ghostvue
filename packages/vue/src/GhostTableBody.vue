<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostTableSectionExposed } from './ghost-table'
import { useGhostTableBody } from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableSectionElement>('element')
const { rootProps } = useGhostTableBody()

const mergedAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
}))

defineExpose<GhostTableSectionExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <tbody ref="element" v-bind="mergedAttrs">
    <slot />
  </tbody>
</template>
