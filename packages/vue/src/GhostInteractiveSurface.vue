<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type {
  InteractiveEffect,
  InteractiveSurfaceElement,
  GhostInteractiveSurfaceExposed,
} from './ghost-interactive-surface'
import { useGhostInteractiveSurface } from './use-ghost-interactive-surface'

const props = withDefaults(
  defineProps<{
    /** Root tag. Default `div`. */
    as?: InteractiveSurfaceElement
    /** Recipes advertised on `data-interactive`. v1 supports `spotlight` only. */
    effects?: InteractiveEffect[]
  }>(),
  {
    as: 'div',
    effects: () => ['spotlight'],
  },
)

const element = useTemplateRef<HTMLElement>('element')
const { rootProps } = useGhostInteractiveSurface(element, {
  effects: () => props.effects,
})

defineExpose<GhostInteractiveSurfaceExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="element" v-bind="rootProps">
    <span data-part="glow" aria-hidden="true" />
    <slot />
  </component>
</template>
