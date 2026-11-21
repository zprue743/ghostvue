<script setup lang="ts">
import { GhostButton, GhostSeparator, GhostToolbar } from '@ghostvue/themes'
</script>

<template>
  <div class="toolbar-themed-example">
    <GhostToolbar label="Table selection">
      <GhostButton size="sm">Edit row</GhostButton>
      <GhostSeparator orientation="vertical" />
      <GhostButton size="sm" tone="danger">Delete</GhostButton>
    </GhostToolbar>
  </div>
</template>

<style scoped>
.toolbar-themed-example {
  display: grid;
}
</style>
