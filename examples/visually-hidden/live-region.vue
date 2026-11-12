<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton, GhostVisuallyHidden } from '@ghostvue/vue'

const status = ref('Ready')

function publish(): void {
  status.value = 'Report published'
}
</script>

<template>
  <GhostButton @click="publish">Publish report</GhostButton>
  <GhostVisuallyHidden role="status" aria-live="polite">
    {{ status }}
  </GhostVisuallyHidden>
</template>
