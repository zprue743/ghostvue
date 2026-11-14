<script setup lang="ts">
import { GhostButton, GhostSeparator, GhostToolbar } from '@ghostvue/themes'
</script>

<template>
  <div class="ghost-theme">
    <GhostToolbar label="Table selection">
      <GhostButton size="sm">Edit row</GhostButton>
      <GhostSeparator orientation="vertical" />
      <GhostButton size="sm" tone="danger">Delete</GhostButton>
    </GhostToolbar>
  </div>
</template>
