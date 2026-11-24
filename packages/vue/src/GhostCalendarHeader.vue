<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostCalendarContextKey,
  resolveCalendarHtmlElement,
  type GhostCalendarHeaderElement,
  type GhostCalendarPartExposed,
} from './ghost-calendar'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    as?: GhostCalendarHeaderElement
  }>(),
  { as: 'div' },
)

const context = inject(ghostCalendarContextKey)
if (!context) {
  throw new Error('GhostCalendarHeader must be used inside GhostCalendar')
}

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveCalendarHtmlElement(hostRef.value))

const headerAttrs = computed(() => ({
  role: 'group',
  'data-part': 'header',
  'data-ghost-calendar': '',
  'aria-label':
    (attrs['aria-label'] as string | undefined) ?? 'Calendar navigation',
  ...attrs,
  // Merge rather than replace so a consumer class keeps the part hook.
  class: ['ghost-calendar-header', attrs.class],
}))

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
  <component :is="as" ref="host" v-bind="headerAttrs">
    <slot />
  </component>
</template>
