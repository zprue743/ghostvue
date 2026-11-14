<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton, GhostInlineAlert } from '@ghostvue/vue'

const showFailure = ref(false)

function simulateFailure() {
  showFailure.value = true
}
</script>

<template>
  <GhostButton type="button" @click="simulateFailure">
    Simulate save failure
  </GhostButton>

  <GhostInlineAlert v-if="showFailure" :heading-level="2" announce="alert">
    <template #title>Save failed</template>
    <template #message>Your changes were not persisted.</template>
    <template #actions>
      <GhostButton type="button">Retry save</GhostButton>
    </template>
  </GhostInlineAlert>
</template>
