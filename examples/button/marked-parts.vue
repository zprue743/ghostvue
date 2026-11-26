<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { GhostButton } from '@ghostvue/themes'

const saving = ref(false)
let resetTimer: ReturnType<typeof setTimeout> | undefined

function save(): void {
  saving.value = true
  resetTimer = setTimeout(() => {
    saving.value = false
  }, 1200)
}

onBeforeUnmount(() => {
  clearTimeout(resetTimer)
})
</script>

<template>
  <GhostButton class="marked-save" :loading="saving" @click="save">
    <svg
      data-part="icon"
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
    >
      <path
        d="M3 13.5V6.2L8 2.5l5 3.7v7.3H3zm2-1h6V7.1L8 4.2 5 7.1v5.4z"
        fill="currentColor"
      />
    </svg>
    <span>Save changes</span>
    <span v-if="saving" data-part="loading-indicator" aria-hidden="true">
      …
    </span>
  </GhostButton>
</template>

<style scoped>
/*
 * data-part marks slot structure the themed wrapper understands.
 * Consumer CSS targets parts without coupling to the library DOM.
 */
.marked-save :deep([data-part='icon']) {
  display: inline-flex;
}

.marked-save :deep([data-part='loading-indicator']) {
  font-size: 0.875em;
  letter-spacing: 0.12em;
  opacity: 0.85;
}
</style>
