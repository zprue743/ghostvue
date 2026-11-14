<script setup lang="ts">
import { GhostCard } from '@ghostvue/vue'
</script>

<template>
  <GhostCard>
    <template #header>
      <h2 style="margin: 0">Quarterly report</h2>
    </template>
    Revenue grew 12% compared to the previous quarter.
    <template #footer>
      <span style="color: var(--ghost-text-muted, #64748b)"
        >Updated 2h ago</span
      >
    </template>
  </GhostCard>
</template>
