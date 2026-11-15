<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type {
  GhostTableHeaderCellExposed,
  GhostTableHeaderCellProps,
} from './ghost-table'
import {
  mergeGhostTablePartAttrs,
  useGhostTableHeaderCell,
} from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

const props = defineProps<GhostTableHeaderCellProps>()

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableCellElement>('element')

const { rootProps } = useGhostTableHeaderCell({
  scope: () => props.scope,
})

const mergedAttrs = computed(() =>
  mergeGhostTablePartAttrs(attrs, rootProps.value),
)

defineExpose<GhostTableHeaderCellExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <th ref="element" v-bind="mergedAttrs">
    <slot />
  </th>
</template>
