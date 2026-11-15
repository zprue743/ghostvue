<script setup lang="ts">
import { inject, onMounted, onUnmounted } from 'vue'

import type { GhostSelectLabelElement } from './ghost-select'
import { useGhostId } from './use-ghost-id'

const labelProps = withDefaults(
  defineProps<{
    as?: GhostSelectLabelElement
  }>(),
  {
    as: 'div',
  },
)

const groupLabel = inject<{ setLabelId: (id: string | null) => void } | null>(
  'ghost-select-group-label-id',
  null,
)

const labelId = useGhostId('ghost-select-label')
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
