<script setup lang="ts">
import { computed, useAttrs, useTemplateRef } from 'vue'

import type {
  GhostToolbarDirection,
  GhostToolbarElement,
  GhostToolbarExposed,
  GhostToolbarOrientation,
} from './ghost-toolbar'
import { useGhostToolbar } from './use-ghost-toolbar'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    orientation?: GhostToolbarOrientation
    loop?: boolean
    dir?: GhostToolbarDirection
    label?: string
    as?: GhostToolbarElement
  }>(),
  {
    orientation: 'horizontal',
    loop: true,
    as: 'div',
  },
)

const attrs = useAttrs()

const hostRef = useTemplateRef<HTMLElement>('host')

const { rootProps, focus, blur } = useGhostToolbar({
  element: () => hostRef.value ?? null,
  orientation: () => props.orientation,
  label: () => props.label,
  loop: () => props.loop,
  dir: () => props.dir,
})

const hostBindings = computed(() => {
  const { class: attrsClass, ...rest } = attrs
  return {
    ...rest,
    ...rootProps.value,
    class: [attrsClass, rootProps.value.class].filter(Boolean),
  }
})

defineExpose<GhostToolbarExposed>({
  get element() {
    return hostRef.value ?? null
  },
  focus,
  blur,
})
</script>

<template>
  <component :is="as" ref="host" v-bind="hostBindings">
    <slot />
  </component>
</template>