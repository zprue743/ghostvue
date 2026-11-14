<script setup lang="ts">
import { GhostInlineAlert } from '@ghostvue/vue'
</script>

<template>
  <GhostInlineAlert :heading-level="2" as="section">
    <template #title>Filters are active</template>
    <template #message>Showing rows that match your current search.</template>
  </GhostInlineAlert>
</template>
