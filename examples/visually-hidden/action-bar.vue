<script setup lang="ts">
import { ref } from 'vue'

import { GhostVisuallyHidden } from '@ghostvue/vue'

const announcement = ref('')

function notify(message: string): void {
  announcement.value = message
}
</script>

<template>
  <div class="vh-action-bar">
    <span class="vh-action-bar__title">Quarterly report.pdf</span>

    <div class="vh-action-bar__controls">
      <button
        type="button"
        class="vh-action-bar__button"
        @click="notify('Downloaded Quarterly report.pdf')"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path
            d="M8 2v8m0 0-3-3m3 3 3-3M3 13h10"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
          />
        </svg>
        <GhostVisuallyHidden>Download Quarterly report.pdf</GhostVisuallyHidden>
      </button>

      <button
        type="button"
        class="vh-action-bar__button"
        @click="notify('Copied share link')"
      >
        <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
          <path
            d="M6.5 9.5 9.5 6.5M5 7l-1.5 1.5a2.1 2.1 0 1 0 3 3L8 10m1-5 1.5-1.5a2.1 2.1 0 1 1 3 3L12 8"
            fill="none"
            stroke="currentColor"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="1.5"
          />
        </svg>
        <GhostVisuallyHidden>Copy share link</GhostVisuallyHidden>
      </button>
    </div>

    <GhostVisuallyHidden role="status" aria-live="polite">
      {{ announcement }}
    </GhostVisuallyHidden>
  </div>
</template>

<style scoped>
.vh-action-bar {
  align-items: center;
  border: 1px solid GrayText;
  border-radius: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: space-between;
  padding: 0.75rem 1rem;
}

.vh-action-bar__title {
  font-size: 0.875rem;
  font-weight: 600;
}

.vh-action-bar__controls {
  display: flex;
  gap: 0.5rem;
}

.vh-action-bar__button {
  align-items: center;
  background: Canvas;
  border: 1px solid GrayText;
  border-radius: 0.375rem;
  color: CanvasText;
  cursor: pointer;
  display: inline-flex;
  justify-content: center;
  min-block-size: 2.25rem;
  min-inline-size: 2.25rem;
}

.vh-action-bar__button:focus-visible {
  outline: 2px solid Highlight;
  outline-offset: 2px;
}
</style>
