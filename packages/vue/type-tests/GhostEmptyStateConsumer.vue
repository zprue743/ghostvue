<script setup lang="ts">
import { GhostEmptyState } from '../src'
</script>

<template>
  <GhostEmptyState
    :heading-level="2"
    as="section"
    class="panel"
    id="reports-empty"
  >
    <template #title>No reports yet</template>
    <template #description>Create one to populate this panel.</template>
    <template #actions>
      <button type="button">Create report</button>
    </template>
  </GhostEmptyState>
</template>
