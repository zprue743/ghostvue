<script setup lang="ts">
import { computed, useAttrs, useTemplateRef, watch } from 'vue'

import type {
  GhostScrollAreaExposed,
  GhostScrollAreaProps,
} from './ghost-scroll-area'
import { useGhostScrollArea } from './use-ghost-scroll-area'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<GhostScrollAreaProps>(), {
  as: 'div',
  orientation: 'vertical',
  type: 'auto',
})

defineSlots<{
  default(): unknown
}>()

const attrs = useAttrs()
const element = useTemplateRef<HTMLElement>('element')

const { as, onKeyDown, rootProps, scheduleOverflowMeasure } =
  useGhostScrollArea(
    {
      as: () => props.as,
      label: () => props.label,
      orientation: () => props.orientation,
      type: () => props.type,
    },
    element,
  )

const hostAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
  class: [attrs.class, rootProps.value.class],
  style: [attrs.style, rootProps.value.style],
}))

watch(
  () => element.value,
  () => {
    scheduleOverflowMeasure()
  },
)

defineExpose<GhostScrollAreaExposed>({
  get element() {
    return element.value ?? undefined
  },
})
</script>

<template>
  <component :is="as" ref="element" v-bind="hostAttrs" @keydown="onKeyDown">
    <slot />
  </component>
</template>
