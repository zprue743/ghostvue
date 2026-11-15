<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbListElement,
  type GhostBreadcrumbListExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

withDefaults(
  defineProps<{
    /** Tag name or component rendered for the ordered list. */
    as?: GhostBreadcrumbListElement
  }>(),
  {
    as: 'ol',
  },
)

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error('GhostBreadcrumbList must be used inside GhostBreadcrumb')
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

const listAttrs = computed(() => ({
  class: 'ghost-breadcrumb-list',
  'data-part': 'list',
}))

defineExpose<GhostBreadcrumbListExposed>({
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
  <component :is="as" ref="host" v-bind="{ ...listAttrs, ...$attrs }">
    <slot />
  </component>
</template>
