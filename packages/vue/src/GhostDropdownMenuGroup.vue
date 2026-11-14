<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import type { GhostDropdownMenuGroupElement } from './ghost-dropdown-menu'

defineOptions({
  inheritAttrs: false,
})

const props = withDefaults(
  defineProps<{
    as?: GhostDropdownMenuGroupElement
  }>(),
  {
    as: 'div',
  },
)

const attrs = useAttrs()

const groupAttrs = computed(() => {
  const rest: Record<string, unknown> = { ...attrs }
  return {
    ...rest,
    role: 'group',
    'data-part': 'group',
  }
})
</script>

<template>
  <component :is="as" v-bind="groupAttrs">
    <slot />
  </component>
</template>