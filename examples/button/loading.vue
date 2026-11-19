<script setup lang="ts">
import { GhostButton } from '@ghostvue/themes'
</script>

<template>
  <!--
    Loading keeps the label in the layout (only hidden), so the button keeps
    its width and the row does not shift when an action becomes pending.
  -->
  <div class="button-states">
    <GhostButton loading>Save changes</GhostButton>
    <GhostButton variant="outline" tone="neutral" loading>
      Export report
    </GhostButton>
    <GhostButton disabled>Unavailable action</GhostButton>
  </div>
</template>

<style scoped>
.button-states {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--ghost-space-gap-sm);
}
</style>
