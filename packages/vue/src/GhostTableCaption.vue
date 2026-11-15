<script setup lang="ts">
import {
  computed,
  inject,
  onUnmounted,
  useAttrs,
  useTemplateRef,
  watch,
} from 'vue'

import {
  ghostTableContextKey,
  type GhostTableCaptionExposed,
} from './ghost-table'
import {
  mergeGhostTablePartAttrs,
  useGhostTableCaption,
} from './use-ghost-table'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

defineSlots<{ default(): unknown }>()

const context = inject(ghostTableContextKey, null)
const attrs = useAttrs()
const element = useTemplateRef<HTMLTableCaptionElement>('element')
const generatedId = useGhostId('ghost-table-caption')
const { rootProps } = useGhostTableCaption()

const captionId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : generatedId.value
})

watch(
  captionId,
  (id) => {
    context?.setCaptionId(id)
  },
  { immediate: true },
)

onUnmounted(() => {
  context?.setCaptionId(undefined)
})

const mergedAttrs = computed(() =>
  mergeGhostTablePartAttrs({ ...attrs, id: captionId.value }, rootProps.value),
)

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
