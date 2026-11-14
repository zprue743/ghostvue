<script setup lang="ts">
import { computed, useAttrs, useSlots, useTemplateRef } from 'vue'

import type {
  GhostInlineAlertExposed,
  GhostInlineAlertProps,
} from './ghost-inline-alert'
import { useGhostInlineAlert } from './use-ghost-inline-alert'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(defineProps<GhostInlineAlertProps>(), {
  as: 'div',
  headingLevel: 3,
  announce: 'off',
})

defineSlots<{
  title(): unknown
  message(): unknown
  actions(): unknown
}>()

const slots = useSlots()
const attrs = useAttrs()
const element = useTemplateRef<HTMLElement>('element')

const hasTitle = computed(() => Boolean(slots['title']))
const hasMessage = computed(() => Boolean(slots['message']))
const hasActions = computed(() => Boolean(slots['actions']))

const { as, headingTag, titleId, rootProps } = useGhostInlineAlert({
  as: () => props.as,
  headingLevel: () => props.headingLevel,
  announce: () => props.announce,
  hasTitle: () => hasTitle.value,
})

const hostAttrs = computed(() => ({
  ...attrs,
  ...rootProps.value,
  class: [attrs.class, rootProps.value.class],
}))

defineExpose<GhostInlineAlertExposed>({
  get element() {
    return element.value
  },
})
</script>

<template>
  <component :is="as" ref="element" v-bind="hostAttrs">
    <component :is="headingTag" v-if="hasTitle" :id="titleId" data-part="title">
      <slot name="title" />
    </component>
    <div v-if="hasMessage" data-part="message">
      <slot name="message" />
    </div>
    <div v-if="hasActions" data-part="actions">
      <slot name="actions" />
    </div>
  </component>
</template>
