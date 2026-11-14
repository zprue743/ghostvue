<script setup lang="ts">
import { GhostButton, GhostToolbar } from '@ghostvue/vue'
</script>

<template>
  <GhostToolbar orientation="vertical" label="Annotation tools">
    <GhostButton type="button">Pointer</GhostButton>
    <GhostButton type="button">Text</GhostButton>
    <GhostButton type="button">Shape</GhostButton>
  </GhostToolbar>
</template>
