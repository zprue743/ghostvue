<script setup lang="ts">
import { computed } from 'vue'

import type { GhostContextMenuSeparatorElement } from './ghost-context-menu'
import type { GhostSeparatorElement } from './ghost-separator'
import { useGhostSeparator } from './use-ghost-separator'

const props = withDefaults(
  defineProps<{
    as?: GhostContextMenuSeparatorElement
    decorative?: boolean
  }>(),
  {
    as: 'div',
    decorative: false,
  },
)

const { rootProps, as } = useGhostSeparator({
  as: () => props.as as GhostSeparatorElement,
  decorative: () => props.decorative,
  orientation: () => 'horizontal',
})

const separatorBindings = computed(() => ({
  ...rootProps.value,
  'data-part': 'separator' as const,
}))
</script>

<template>
  <component :is="as" v-bind="separatorBindings" />
</template>
