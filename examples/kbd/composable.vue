<script setup lang="ts">
import { useGhostKbd } from '@ghostvue/vue'

const { rootProps, keyItems } = useGhostKbd({
  keys: ['mod', 'k'],
  platform: 'pc',
})
</script>

<template>
  <kbd v-bind="rootProps">
    <template v-for="(item, index) in keyItems" :key="index">
      <span v-if="index > 0" data-part="separator">+</span>
      <kbd data-part="key">{{ item.label }}</kbd>
    </template>
  </kbd>
</template>
