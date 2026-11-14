<script setup lang="ts">
import { GhostToggleGroup, GhostToggleGroupItem } from '@ghostvue/themes'
</script>

<template>
  <GhostToggleGroup default-value="list" aria-label="Asset layout">
    <GhostToggleGroupItem value="list">List</GhostToggleGroupItem>
    <GhostToggleGroupItem value="grid">Grid</GhostToggleGroupItem>
    <GhostToggleGroupItem value="board">Board</GhostToggleGroupItem>
  </GhostToggleGroup>
</template>
