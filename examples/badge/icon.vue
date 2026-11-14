<script setup lang="ts">
import { GhostBadge } from '@ghostvue/themes'
</script>

<template>
  <GhostBadge tone="accent">
    <svg
      data-part="icon"
      aria-hidden="true"
      viewBox="0 0 16 16"
      width="16"
      height="16"
    >
      <circle cx="8" cy="8" r="5" fill="currentColor" />
    </svg>
    Live
  </GhostBadge>
</template>
