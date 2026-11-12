<script setup lang="ts">
import { GhostVisuallyHidden } from '@ghostvue/vue'
</script>

<template>
  <button type="button">
    <svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16">
      <path
        d="M4 5h8l-1 9H5L4 5zm2-2h4l.5 2h-5z"
        fill="none"
        stroke="currentColor"
        stroke-width="1.25"
      />
    </svg>
    <GhostVisuallyHidden>Delete report</GhostVisuallyHidden>
  </button>
</template>
