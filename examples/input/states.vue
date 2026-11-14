<script setup lang="ts">
import { GhostInput } from '@ghostvue/themes'
</script>

<template>
  <div class="states">
    <label>
      Disabled
      <GhostInput disabled default-value="cannot edit" />
    </label>
    <label>
      Readonly
      <GhostInput readonly default-value="copied value" />
    </label>
    <label>
      Invalid
      <GhostInput invalid default-value="bad query" />
    </label>
    <label>
      Required
      <GhostInput required placeholder="Your name" />
    </label>
  </div>
</template>

<style scoped>
.states {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}
</style>
