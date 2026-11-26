<script setup>
import { ref } from 'vue'

import { GhostButton } from '@ghostvue/vue'

const pressed = ref(false)
</script>

<template>
  <!-- Headless GhostButton has no `variant` prop, no `icon` slot, and no v-model. -->
  <GhostButton v-model="pressed" variant="outline">
    <template #icon>+</template>
    Save
  </GhostButton>
</template>
