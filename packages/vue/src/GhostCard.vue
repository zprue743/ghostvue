<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue'

import type { GhostCardExposed, GhostCardProps } from './ghost-card'
import { useGhostCard } from './use-ghost-card'
import { useGhostInteractiveSurface } from './use-ghost-interactive-surface'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<GhostCardProps>(), {
  as: 'article',
  effects: () => [],
})

defineSlots<{
  header(): unknown
  default(): unknown
  footer(): unknown
}>()

const slots = useSlots()
const attrs = useAttrs()
const element = useTemplateRef<HTMLElement>('element')

const hasHeader = computed(() => Boolean(slots['header']))
const hasContent = computed(() => Boolean(slots['default']))
const hasFooter = computed(() => Boolean(slots['footer']))

const spotlightActive = computed(() => props.effects.includes('spotlight'))

const { as, rootProps: cardRootProps, isActionRoot } = useGhostCard({
  as: () => props.as,
})

const partTag = computed(() => (isActionRoot.value ? 'span' : 'div'))

const { rootProps: interactiveRootProps } = useGhostInteractiveSurface(
  element,
  {
    effects: () => props.effects,
    stateAttribute: 'data-interactive-state',
  },
)

const hostAttrs = computed(() => ({
  ...attrs,
  ...cardRootProps.value,
  ...interactiveRootProps.value,
  ...(props.as === 'button' && attrs.type === undefined
    ? { type: 'button' as const }
    : {}),
  class: [attrs.class, cardRootProps.value.class],
}))

defineExpose<GhostCardExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="element" v-bind="hostAttrs">
    <span v-if="spotlightActive" data-part="glow" aria-hidden="true" />
    <component :is="partTag" v-if="hasHeader" data-part="header">
      <slot name="header" />
    </component>
    <component :is="partTag" v-if="hasContent" data-part="content">
      <slot />
    </component>
    <component :is="partTag" v-if="hasFooter" data-part="footer">
      <slot name="footer" />
    </component>
  </component>
</template>
