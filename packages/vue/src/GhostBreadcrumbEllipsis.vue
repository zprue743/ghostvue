<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import GhostPopover from './GhostPopover.vue'
import GhostPopoverContent from './GhostPopoverContent.vue'
import GhostPopoverTrigger from './GhostPopoverTrigger.vue'
import {
  ghostBreadcrumbContextKey,
  resolveBreadcrumbHtmlElement,
  type GhostBreadcrumbEllipsisExposed,
} from './ghost-breadcrumb'

defineOptions({ inheritAttrs: false })

const props = withDefaults(
  defineProps<{
    /** Accessible name for the ellipsis disclosure trigger. */
    label?: string
  }>(),
  {
    label: 'Show more breadcrumb segments',
  },
)

defineSlots<{
  default(): unknown
  icon(): unknown
}>()

const context = inject(ghostBreadcrumbContextKey)
if (!context) {
  throw new Error('GhostBreadcrumbEllipsis must be used inside GhostBreadcrumb')
}

const hostRef = useTemplateRef('host')
const element = computed(() => resolveBreadcrumbHtmlElement(hostRef.value))

const triggerAttrs = computed(() => ({
  'aria-label': props.label,
  class: 'ghost-breadcrumb-ellipsis',
  'data-part': 'ellipsis',
}))

defineExpose<GhostBreadcrumbEllipsisExposed>({
  get element() {
    return element.value
  },
  focus(options?: FocusOptions) {
    const button = element.value?.querySelector('button')
    button?.focus(options)
  },
  blur() {
    const button = element.value?.querySelector('button')
    button?.blur()
  },
})
</script>

<template>
  <span ref="host" class="ghost-breadcrumb-ellipsis-host" data-part="ellipsis">
    <GhostPopover>
      <GhostPopoverTrigger v-bind="triggerAttrs">
        <slot name="icon">…</slot>
      </GhostPopoverTrigger>
      <GhostPopoverContent class="ghost-breadcrumb-ellipsis-content">
        <slot />
      </GhostPopoverContent>
    </GhostPopover>
  </span>
</template>
