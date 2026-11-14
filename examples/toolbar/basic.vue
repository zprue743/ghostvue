<script setup lang="ts">
import { GhostButton, GhostToolbar } from '@ghostvue/vue'
</script>

<template>
  <GhostToolbar label="Row actions" data-testid="example-toolbar-basic">
    <GhostButton type="button">Edit</GhostButton>
    <GhostButton type="button">Share</GhostButton>
    <GhostButton type="button" disabled>Archive</GhostButton>
  </GhostToolbar>
</template>
