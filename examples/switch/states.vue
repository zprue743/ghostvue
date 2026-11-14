<script setup lang="ts">
import { GhostSwitch } from '@ghostvue/themes'
</script>

<template>
  <div class="settings">
    <label for="locked-off">Disabled off</label>
    <GhostSwitch id="locked-off" disabled />
    <label for="locked-on">Disabled on</label>
    <GhostSwitch id="locked-on" disabled default-value />
    <label for="policy">Read-only policy</label>
    <GhostSwitch id="policy" readonly default-value />
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
