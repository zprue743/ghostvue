<script setup lang="ts">
import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostTabs orientation="vertical" default-value="overview">
    <div style="display: flex; gap: 1rem">
      <GhostTabsList>
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
