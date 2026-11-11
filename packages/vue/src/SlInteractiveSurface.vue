<script setup lang="ts">
import { useTemplateRef } from 'vue'

import type {
  InteractiveEffect,
  InteractiveSurfaceElement,
  SlInteractiveSurfaceExposed,
} from './sl-interactive-surface'
import { useSlInteractiveSurface } from './use-sl-interactive-surface'

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
const { rootProps } = useSlInteractiveSurface(element, {
  effects: () => props.effects,
})

defineExpose<SlInteractiveSurfaceExposed>({
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
