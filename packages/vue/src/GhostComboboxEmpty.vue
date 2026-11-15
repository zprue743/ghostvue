<script setup lang="ts">
import { computed, inject } from 'vue'

import {
  ghostComboboxContextKey,
  type GhostComboboxContext,
  type GhostComboboxEmptyElement,
} from './ghost-combobox'

const props = withDefaults(
  defineProps<{
    as?: GhostComboboxEmptyElement
  }>(),
  {
    as: 'div',
  },
)

const injected = inject(ghostComboboxContextKey)
if (!injected) {
  throw new Error('GhostComboboxEmpty must be used inside GhostCombobox')
}
const context: GhostComboboxContext = injected

const visible = computed(
  () =>
    context.isOpen.value &&
    !context.loading.value &&
    context.optionCount.value === 0,
)
</script>

<template>
  <component
    :is="props.as"
    v-show="visible"
    role="status"
    data-part="empty"
    class="ghost-combobox-empty"
  >
    <slot />
  </component>
</template>
