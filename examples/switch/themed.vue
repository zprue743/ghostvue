<script setup lang="ts">
import { GhostSwitch } from '@ghostvue/themes'
</script>

<template>
  <div class="settings">
    <label for="dark-mode">Dark mode</label>
    <GhostSwitch id="dark-mode" />
    <label for="alerts">Danger alerts</label>
    <GhostSwitch id="alerts" tone="danger" size="sm" default-value />
  </div>
</template>

<style scoped>
.settings {
  align-items: center;
  display: grid;
  gap: var(--ghost-space-gap-sm);
  grid-template-columns: max-content max-content;
}
</style>
