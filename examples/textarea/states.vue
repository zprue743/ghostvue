<script setup lang="ts">
import { GhostTextarea } from '@ghostvue/themes'
</script>

<template>
  <div class="states">
    <label for="disabled-notes">Disabled</label>
    <GhostTextarea id="disabled-notes" default-value="Cannot edit" disabled />

    <label for="readonly-notes">Readonly</label>
    <GhostTextarea
      id="readonly-notes"
      default-value="Visible, not editable"
      readonly
    />

    <label for="invalid-notes">Invalid</label>
    <GhostTextarea
      id="invalid-notes"
      default-value="Needs a second sentence"
      invalid
      required
    />
  </div>
</template>

<style scoped>
.states {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}
</style>
