<script setup lang="ts">
import { computed, provide, shallowRef, useAttrs, useTemplateRef } from 'vue'

import {
  ghostTableContextKey,
  type GhostTableExposed,
  type GhostTableProps,
} from './ghost-table'
import { mergeGhostTablePartAttrs, useGhostTable } from './use-ghost-table'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<GhostTableProps>(), {
  containHorizontal: false,
  scrollLabel: undefined,
})

defineSlots<{ default(): unknown }>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLTableElement>('element')
const captionId = shallowRef<string | undefined>()

provide(ghostTableContextKey, {
  captionId,
  setCaptionId(id: string | undefined) {
    captionId.value = id
  },
})

const { containHorizontal, tableProps, scrollContainerProps } = useGhostTable({
  containHorizontal: () => props.containHorizontal,
  scrollLabel: () => props.scrollLabel,
  captionId: () => captionId.value,
})

const mergedTableAttrs = computed(() =>
  mergeGhostTablePartAttrs(attrs, tableProps.value),
)

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