<script setup lang="ts">
import { ref } from 'vue'

import { GhostVisuallyHidden } from '@ghostvue/vue'

const report = ref<{ name: string } | null>({ name: 'Q3 revenue' })

function remove(name: string): void {
  if (report.value?.name === name) {
    report.value = null
  }
}
</script>

<template>
  <button v-if="report" type="button" @click="remove(report.name)">
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path
        d="M4 5h8l-1 9H5L4 5zm2-2h4l.5 2h-5z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
    </svg>
    <GhostVisuallyHidden>Delete {{ report.name }}</GhostVisuallyHidden>
  </button>
  <p v-else>Report deleted.</p>
</template>
