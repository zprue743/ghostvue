<script setup lang="ts">
import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostTooltip :delay-duration="300" :skip-delay-duration="150">
    <GhostTooltipTrigger aria-label="Archive row">
      <span aria-hidden="true">📦</span>
    </GhostTooltipTrigger>
    <GhostTooltipContent :offset="6">
      Move this dataset to long-term archive storage.
    </GhostTooltipContent>
  </GhostTooltip>
</template>
