<script setup lang="ts">
import { computed, inject, useTemplateRef, watch } from 'vue'

import {
  ghostTabsContextKey,
  resolveTabsHtmlElement,
  type GhostTabsListElement,
  type GhostTabsListExposed,
} from './ghost-tabs'
import { useRovingFocus } from './use-roving-focus'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the tab list. */
    as?: GhostTabsListElement
  }>(),
  {
    as: 'div',
  },
)

const injected = inject(ghostTabsContextKey)
if (!injected) {
  throw new Error('GhostTabsList must be used inside GhostTabs')
}
const context = injected

const hostRef = useTemplateRef('host')
const element = computed(() => resolveTabsHtmlElement(hostRef.value))

useRovingFocus(element, {
  orientation: () => context.orientation.value,
  dir: () => {
    const explicit = context.dir.value
    if (explicit === 'ltr' || explicit === 'rtl') {
      return explicit
    }
    const host = element.value
    if (host) {
      const closest = host.closest('[dir]')?.getAttribute('dir')
      if (closest === 'ltr' || closest === 'rtl') {
        return closest
      }
    }
    return document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr'
  },
  loop: true,
})

watch(
  () =>
    [
      context.modelValue.value,
      context.tabStopValue.value,
      context.registryVersion.value,
    ] as const,
  () => {
    const list = element.value
    if (list) {
      context.syncSelectionTabStops(list)
    }
  },
  { flush: 'post' },
)

function onFocusOut(event: FocusEvent): void {
  const list = element.value
  if (!list) {
    return
  }
  const related = event.relatedTarget
  if (related instanceof Node && list.contains(related)) {
    return
  }
  context.syncSelectionTabStops(list)
}

const listAttrs = computed(() => ({
  role: 'tablist',
  'aria-orientation': context.orientation.value,
  class: 'ghost-tabs-list',
  'data-part': 'list',
  'data-ghost-tabs': '',
}))

defineExpose<GhostTabsListExposed>({
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
  <component
    :is="as"
    ref="host"
    v-bind="{ ...listAttrs, ...$attrs }"
    @focusout="onFocusOut"
  >
    <slot />
  </component>
</template>
