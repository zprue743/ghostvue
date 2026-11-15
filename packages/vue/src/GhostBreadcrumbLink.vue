<script setup lang="ts">
import { computed, inject, useAttrs, useTemplateRef } from 'vue'

import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbLinkElement,
  type GhostBreadcrumbLinkExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Tag name or component rendered for the ancestor segment. */
    as?: GhostBreadcrumbLinkElement
  }>(),
  {
    as: 'a',
  },
)

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error('GhostBreadcrumbLink must be used inside GhostBreadcrumb')
}

const attrs = useAttrs()
const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

const linkAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  return {
    ...rest,
    class: 'ghost-breadcrumb-link',
    'data-part': 'link',
  }
})

defineExpose<GhostBreadcrumbLinkExposed>({
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
  <component :is="props.as" ref="host" v-bind="linkAttrs">
    <slot />
  </component>
</template>
