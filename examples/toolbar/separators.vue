<script setup lang="ts">
import { GhostButton, GhostSeparator, GhostToolbar } from '@ghostvue/vue'
</script>

<template>
  <GhostToolbar label="Clipboard">
    <GhostButton type="button">Cut</GhostButton>
    <GhostButton type="button">Copy</GhostButton>
    <GhostButton type="button">Paste</GhostButton>
    <GhostSeparator orientation="vertical" />
    <GhostButton type="button">Undo</GhostButton>
    <GhostButton type="button">Redo</GhostButton>
  </GhostToolbar>
</template>
