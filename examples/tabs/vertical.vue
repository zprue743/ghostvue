<script setup lang="ts">
import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <!-- ArrowUp and ArrowDown move between tabs in a vertical list. -->
  <GhostTabs orientation="vertical" default-value="overview">
    <div class="tabs">
      <GhostTabsList aria-label="Record" class="tabs__list">
        <GhostTabsTrigger value="overview">Overview</GhostTabsTrigger>
        <GhostTabsTrigger value="details">Details</GhostTabsTrigger>
        <GhostTabsTrigger value="history">History</GhostTabsTrigger>
      </GhostTabsList>
      <GhostTabsContent value="overview">
        High-level summary of the current record.
      </GhostTabsContent>
      <GhostTabsContent value="details">
        Field-level metadata and validation rules.
      </GhostTabsContent>
      <GhostTabsContent value="history">
        Audit trail of the most recent edits.
      </GhostTabsContent>
    </div>
  </GhostTabs>
</template>

<style scoped>
/* The list stacks above the panel when narrow and sits beside it from 24rem. */
.tabs {
  display: grid;
  gap: var(--ghost-space-stack-sm) var(--ghost-space-gap-md);
}

.tabs__list {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

@container ghost-demo (min-width: 24rem) {
  .tabs {
    align-items: start;
    grid-template-columns: auto minmax(0, 1fr);
  }
}
</style>
