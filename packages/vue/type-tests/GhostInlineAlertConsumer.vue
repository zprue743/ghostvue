<script setup lang="ts">
import { GhostInlineAlert } from '../src'
</script>

<template>
  <GhostInlineAlert
    :heading-level="2"
    announce="alert"
    as="section"
    class="table-banner"
    id="load-error"
  >
    <template #title>Unable to load rows</template>
    <template #message>The table could not refresh.</template>
    <template #actions>
      <button type="button">Retry</button>
    </template>
  </GhostInlineAlert>
</template>
