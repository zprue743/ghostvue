<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type { GhostTableExposed, GhostTableProps } from './ghost-table'
import { useGhostTable } from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<GhostTableProps>(), {
  containHorizontal: false,
})

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableElement>('element')

const { containHorizontal, tableProps, scrollContainerProps } = useGhostTable({
  containHorizontal: () => props.containHorizontal,
})

const mergedTableAttrs = computed(() => ({
  ...attrs,
  ...tableProps.value,
}))

defineExpose<GhostTableExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <div v-if="containHorizontal" v-bind="scrollContainerProps">
    <table ref="element" v-bind="mergedTableAttrs">
      <slot />
    </table>
  </div>
  <table v-else ref="element" v-bind="mergedTableAttrs">
    <slot />
  </table>
</template>
