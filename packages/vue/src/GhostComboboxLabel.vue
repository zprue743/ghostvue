<script setup lang="ts">
import { inject, onMounted, onUnmounted } from 'vue'

import {
  ghostComboboxGroupLabelKey,
  type GhostComboboxLabelElement,
} from './ghost-combobox'
import { useGhostId } from './use-ghost-id'

const labelProps = withDefaults(
  defineProps<{
    as?: GhostComboboxLabelElement
  }>(),
  {
    as: 'div',
  },
)

const groupLabel = inject(ghostComboboxGroupLabelKey, null)

const labelId = useGhostId('ghost-combobox-label')
onMounted(() => {
  groupLabel?.setLabelId(labelId.value)
})

onUnmounted(() => {
  groupLabel?.setLabelId(null)
})
</script>

<template>
  <component :is="labelProps.as" :id="labelId" data-part="label">
    <slot />
  </component>
</template>
