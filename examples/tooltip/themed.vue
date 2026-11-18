<script setup lang="ts">
import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <GhostTooltip>
    <GhostTooltipTrigger>Hover for glossary</GhostTooltipTrigger>
    <GhostTooltipContent placement="bottom" :offset="8">
      Latency p95 is the 95th percentile response time over the selected window.
    </GhostTooltipContent>
  </GhostTooltip>
</template>
