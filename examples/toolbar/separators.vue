<script setup lang="ts">
import { GhostButton, GhostSeparator, GhostToolbar } from '@ghostvue/vue'
</script>

<template>
  <GhostToolbar class="clipboard" label="Clipboard">
    <GhostButton type="button">Cut</GhostButton>
    <GhostButton type="button">Copy</GhostButton>
    <GhostButton type="button">Paste</GhostButton>
    <GhostSeparator orientation="vertical" />
    <GhostButton type="button">Undo</GhostButton>
    <GhostButton type="button">Redo</GhostButton>
  </GhostToolbar>
</template>

<style scoped>
/*
 * Headless path ships no layout or visuals; this is consumer CSS for the
 * sample. A row keeps the vertical separator between the button groups.
 */
.clipboard {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.ghost-separator {
  align-self: stretch;
  border-inline-start: 1px solid GrayText;
}
</style>
