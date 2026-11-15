<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import type { GhostContextMenuLabelElement } from './ghost-context-menu'
import { useGhostId } from './use-ghost-id'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostContextMenuLabelElement
  }>(),
  {
    as: 'div',
  },
)

const attrs = useAttrs()
const defaultId = useGhostId('ghost-context-menu-label')

const labelId = computed(() => {
  const custom = attrs['id']
  return typeof custom === 'string' && custom.length > 0
    ? custom
    : defaultId.value
})

const labelAttrs = computed(() => {
  const rest: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(attrs)) {
    if (key !== 'id') {
      rest[key] = value
    }
  }
  return {
    ...rest,
    id: labelId.value,
    'data-part': 'label',
  }
})
</script>

<template>
  <component :is="props.as" v-bind="labelAttrs">
    <slot />
  </component>
</template>
