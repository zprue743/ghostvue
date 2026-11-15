<script setup lang="ts">
import { computed, inject, provide, shallowRef } from 'vue'

import {
  ghostComboboxContextKey,
  ghostComboboxGroupLabelKey,
  type GhostComboboxGroupElement,
} from './ghost-combobox'

const groupProps = withDefaults(
  defineProps<{
    as?: GhostComboboxGroupElement
  }>(),
  {
    as: 'div',
  },
)

const injectContext = inject(ghostComboboxContextKey)
if (!injectContext) {
  throw new Error('GhostComboboxGroup must be used inside GhostCombobox')
}

const labelId = shallowRef<string | null>(null)
provide(ghostComboboxGroupLabelKey, {
  setLabelId(id: string | null) {
    labelId.value = id
  },
})

const groupAttrs = computed(() => ({
  role: 'group',
  'aria-labelledby': labelId.value ?? undefined,
  'data-part': 'group',
}))
</script>

<template>
  <component :is="groupProps.as" v-bind="groupAttrs">
    <slot />
  </component>
</template>