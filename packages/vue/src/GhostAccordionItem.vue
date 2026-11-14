<script setup lang="ts">
import { computed, inject, provide } from 'vue'

import {
  ghostAccordionContextKey,
  ghostAccordionItemContextKey,
} from './ghost-accordion'
import GhostCollapsible from './GhostCollapsible.vue'

const props = withDefaults(
  defineProps<{
    /** Stable value identifying this panel in the root `modelValue`. */
    value: string
    /** Disables toggling on this item. */
    disabled?: boolean
  }>(),
  {
    disabled: false,
  },
)

const context = inject(ghostAccordionContextKey)
if (!context) {
  throw new Error('GhostAccordionItem must be used inside GhostAccordion')
}
const accordionContext = context

const isDisabled = computed(
  () =>
    props.disabled ||
    accordionContext.disabled.value ||
    accordionContext.isItemDisabled(props.value),
)

const isOpen = computed(() => accordionContext.isItemOpen(props.value))

function onOpenChange(open: boolean): void {
  accordionContext.setItemOpen(props.value, open)
}

provide(ghostAccordionItemContextKey, {
  value: props.value,
  disabled: computed(() => props.disabled),
})

defineSlots<{
  default(): unknown
}>()
</script>

<template>
  <div
    class="ghost-accordion-item"
    :data-ghost-accordion-value="value"
    data-part="item"
  >
    <GhostCollapsible
      :open="isOpen"
      :disabled="isDisabled"
      @update:open="onOpenChange"
    >
      <slot />
    </GhostCollapsible>
  </div>
</template>
