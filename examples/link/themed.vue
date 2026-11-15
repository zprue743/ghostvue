<script setup lang="ts">
import { GhostLink } from '@ghostvue/themes'
</script>

<template>
  <div
    style="
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-start;
    "
  >
    <GhostLink href="/philosophy">Read the philosophy (inline)</GhostLink>
    <GhostLink href="/philosophy" variant="subtle">
      Read the philosophy (subtle)
    </GhostLink>
  </div>
</template>
