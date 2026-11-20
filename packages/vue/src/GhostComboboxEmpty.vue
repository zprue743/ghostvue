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

<!--
  No role: the empty message is not an option, and an open list with no
  options drops its listbox role (see GhostComboboxContent), so the message
  reads as plain text in the popup. The root's polite live region already
  announces the empty result (`messages.empty`); a role="status" here only
  repeated it.
-->
<template>
  <component
    :is="props.as"
    v-show="visible"
    data-part="empty"
    class="ghost-combobox-empty"
  >
    <slot />
  </component>
</template>
