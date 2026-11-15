<script setup lang="ts">
import { GhostInlineAlert } from '@ghostvue/themes'
</script>

<template>
  <GhostInlineAlert :heading-level="2" tone="danger" variant="soft">
    <template #title>Could not refresh rows</template>
    <template #message>
      The server returned an error. Your last successful data is still shown
      below.
    </template>
  </GhostInlineAlert>
</template>
