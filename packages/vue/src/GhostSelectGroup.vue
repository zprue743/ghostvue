<script setup lang="ts">
import { computed, inject, provide, shallowRef } from 'vue'

import {
  ghostSelectContextKey,
  type GhostSelectGroupElement,
} from './ghost-select'

const groupProps = withDefaults(
  defineProps<{
    as?: GhostSelectGroupElement
  }>(),
  {
    as: 'div',
  },
)

const injectContext = inject(ghostSelectContextKey)
if (!injectContext) {
  throw new Error('GhostSelectGroup must be used inside GhostSelect')
}

const labelId = shallowRef<string | null>(null)
provide('ghost-select-group-label-id', {
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
