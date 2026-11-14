<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue'

import type {
  GhostEmptyStateExposed,
  GhostEmptyStateProps,
} from './ghost-empty-state'
import { useGhostEmptyState } from './use-ghost-empty-state'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<GhostEmptyStateProps>(), {
  as: 'div',
  headingLevel: 3,
})

defineSlots<{
  visual(): unknown
  title(): unknown
  description(): unknown
  actions(): unknown
}>()

const slots = useSlots()
const attrs = useAttrs()
const element = useTemplateRef<HTMLElement>('element')

const hasVisual = computed(() => Boolean(slots['visual']))
const hasTitle = computed(() => Boolean(slots['title']))
const hasDescription = computed(() => Boolean(slots['description']))
const hasActions = computed(() => Boolean(slots['actions']))

const { as, headingTag, titleId, rootProps } = useGhostEmptyState({
  as: () => props.as,
  headingLevel: () => props.headingLevel,
  hasTitle: () => hasTitle.value,
})

const hostAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
  class: [attrs.class, rootProps.value.class],
}))

defineExpose<GhostEmptyStateExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="element" v-bind="hostAttrs">
    <div v-if="hasVisual" data-part="visual" aria-hidden="true">
      <slot name="visual" />
    </div>
    <component :is="headingTag" v-if="hasTitle" :id="titleId" data-part="title">
      <slot name="title" />
    </component>
    <div v-if="hasDescription" data-part="description">
      <slot name="description" />
    </div>
    <div v-if="hasActions" data-part="actions">
      <slot name="actions" />
    </div>
  </component>
</template>
