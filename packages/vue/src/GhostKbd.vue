<script setup lang="ts">
import { useSlots } from 'vue'

import type { GhostKbdPlatform } from './ghost-kbd'
import { useGhostKbd } from './use-ghost-kbd'

// Declared props only; native HTML/ARIA stay fallthrough so the generator omits them.
const props = withDefaults(
  defineProps<{
    keys?: string | readonly string[]
    platform?: GhostKbdPlatform
  }>(),
  {
    keys: () => [],
    platform: 'auto',
  },
)

const { rootProps, keyItems } = useGhostKbd({
  keys: () => props.keys,
  platform: () => props.platform,
})

const slots = useSlots()
</script>

<template>
  <kbd v-bind="rootProps">
    <template v-if="keyItems.length">
      <template v-for="(item, index) in keyItems" :key="index">
        <span v-if="index > 0" data-part="separator">+</span>
        <kbd data-part="key">
          <abbr v-if="item.abbrTitle" :title="item.abbrTitle">{{
            item.label
          }}</abbr>
          <template v-else>{{ item.label }}</template>
        </kbd>
      </template>
      <template v-if="slots['default']">
        <span data-part="separator">+</span>
        <slot />
      </template>
    </template>
    <slot v-else />
  </kbd>
</template>
