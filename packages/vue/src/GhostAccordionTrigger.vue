<script setup lang="ts">
import { computed, inject, useTemplateRef } from 'vue'

import {
  ghostAccordionContextKey,
  ghostAccordionItemContextKey,
  type GhostAccordionTriggerElement,
  type GhostAccordionTriggerExposed,
} from './ghost-accordion'
import GhostCollapsibleTrigger from './GhostCollapsibleTrigger.vue'
import type { GhostCollapsibleTriggerExposed } from './ghost-collapsible'

defineOptions({
  inheritAttrs: false,
})

withDefaults(
  defineProps<{
    /** Tag name or component forwarded to the inner disclosure trigger. */
    as?: GhostAccordionTriggerElement
  }>(),
  {
    as: 'button',
  },
)

const accordionContext = inject(ghostAccordionContextKey)
if (!accordionContext) {
  throw new Error('GhostAccordionTrigger must be used inside GhostAccordion')
}

const itemContext = inject(ghostAccordionItemContextKey)
if (!itemContext) {
  throw new Error(
    'GhostAccordionTrigger must be used inside GhostAccordionItem',
  )
}

const innerRef = useTemplateRef<GhostCollapsibleTriggerExposed>('inner')

const headingTag = computed(
  () => `h${String(accordionContext.headingLevel.value)}`,
)

const expansionLocked = computed(
  () =>
    accordionContext.type.value === 'single' &&
    !accordionContext.collapsible.value &&
    accordionContext.isItemOpen(itemContext.value) &&
    !itemContext.disabled.value &&
    !accordionContext.disabled.value,
)

const lockedTriggerAttrs = computed(() =>
  expansionLocked.value ? { 'aria-disabled': 'true' as const } : {},
)

defineExpose<GhostAccordionTriggerExposed>({
  get element() {
    return innerRef.value?.element ?? null
  },
  focus(options?: FocusOptions) {
    innerRef.value?.focus(options)
  },
  blur() {
    innerRef.value?.blur()
  },
})
</script>

<template>
  <component :is="headingTag" class="ghost-accordion-header" data-part="header">
    <GhostCollapsibleTrigger
      ref="inner"
      v-bind="{ ...$attrs, ...lockedTriggerAttrs }"
      :as="as"
    >
      <slot />
    </GhostCollapsibleTrigger>
  </component>
</template>