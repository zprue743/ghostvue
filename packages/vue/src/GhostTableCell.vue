<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostTableCellExposed } from './ghost-table'
import { mergeGhostTablePartAttrs, useGhostTableCell } from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableCellElement>('element')
const { rootProps } = useGhostTableCell()

const mergedAttrs = computed(() =>
  mergeGhostTablePartAttrs(attrs, rootProps.value),
)

defineExpose<GhostTableCellExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <td ref="element" v-bind="mergedAttrs">
    <slot />
  </td>
</template>
