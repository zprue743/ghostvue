<script setup lang="ts">
import { GhostCard } from '@ghostvue/vue'
</script>

<template>
  <GhostCard
    as="a"
    href="#reports/q3"
    style="text-decoration: none; color: inherit"
  >
    <template #header>
      <strong>Q3 report</strong>
    </template>
    Full revenue summary and region breakdown.
    <template #footer>
      <span>View report →</span>
    </template>
  </GhostCard>
</template>
