<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostTableRowExposed } from './ghost-table'
import { useGhostTableRow } from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableRowElement>('element')
const { rootProps } = useGhostTableRow()

const mergedAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
}))

defineExpose<GhostTableRowExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <tr ref="element" v-bind="mergedAttrs">
    <slot />
  </tr>
</template>
