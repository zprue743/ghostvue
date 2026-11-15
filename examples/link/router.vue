<script setup lang="ts">
import { defineComponent, h } from 'vue'

import { GhostLink } from '@ghostvue/vue'

/** Stand-in for RouterLink — real apps pass `as` without importing vue-router here. */
const AppRouterLink = defineComponent({
  name: 'AppRouterLink',
  props: {
    to: { type: String, required: true },
  },
  setup(props, { slots }) {
    return () => h('a', { href: props.to }, slots['default']?.())
  },
})
</script>

<template>
  <GhostLink :as="AppRouterLink" to="/components/button"
    >In-app route</GhostLink
  >
</template>
