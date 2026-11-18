<script setup lang="ts">
import { GhostScrollArea } from '@ghostvue/themes'
</script>

<template>
  <GhostScrollArea
    label="Inbox"
    style="max-block-size: 8rem; max-inline-size: 20rem"
    data-testid="scroll-area-themed"
  >
    <p v-for="index in 10" :key="index">Message {{ index }}</p>
  </GhostScrollArea>
</template>
