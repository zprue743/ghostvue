<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostCalendarContextKey,
  resolveCalendarHtmlElement,
  type GhostCalendarContext,
  type GhostCalendarNavButtonElement,
  type GhostCalendarPartExposed,
} from './ghost-calendar'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    as?: GhostCalendarNavButtonElement
  }>(),
  { as: 'button' },
)

const injected = inject(ghostCalendarContextKey)
if (!injected) {
  throw new Error('GhostCalendarPrevButton must be used inside GhostCalendar')
}
const context: GhostCalendarContext = injected

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveCalendarHtmlElement(hostRef.value))
const isNativeButton = computed(() => props.as === 'button')

const buttonAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  return {
    ...rest,
    type: isNativeButton.value ? (attrs['type'] ?? 'button') : attrs['type'],
    class: 'ghost-calendar-prev',
    'data-part': 'prev',
    'data-ghost-calendar': '',
    'aria-label':
      (attrs['aria-label'] as string | undefined) ?? 'Previous month',
    disabled: context.disabled.value ? true : attrs['disabled'],
  }
})

function onClick(event: MouseEvent) {
  if (context.disabled.value) {
    event.preventDefault()
    return
  }
  context.goToPreviousMonth()
}

defineExpose<GhostCalendarPartExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    element.value?.focus(options)
  },
  blur() {
    element.value?.blur()
  },
})
</script>

<template>
  <component :is="as" ref="host" v-bind="buttonAttrs" @click="onClick">
    <slot>Previous</slot>
  </component>
</template>
