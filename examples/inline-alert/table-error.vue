<script setup lang="ts">
import { GhostButton, GhostInlineAlert } from '@ghostvue/themes'
</script>

<template>
  <GhostInlineAlert
    :heading-level="2"
    as="section"
    tone="danger"
    variant="outline"
    data-testid="table-load-error"
  >
    <template #title>Unable to load table</template>
    <template #message>
      A network error prevented rows from loading. Cached data may be stale.
    </template>
    <template #actions>
      <GhostButton type="button">Retry load</GhostButton>
    </template>
  </GhostInlineAlert>
</template>
