<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'
</script>

<template>
  <GhostButton icon-only aria-label="Close dialog">
    <svg
      data-part="icon"
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
    >
      <path
        d="M3 3l10 10M13 3L3 13"
        fill="none"
        stroke="currentColor"
        stroke-width="1.5"
      />
    </svg>
  </GhostButton>
</template>
