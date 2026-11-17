<script setup lang="ts">
import { GhostInlineAlert } from '../src'
</script>

<template>
  <GhostInlineAlert
    id="load-error"
    :heading-level="2"
    announce="alert"
    as="section"
    class="table-banner"
  >
    <template #title>Unable to load rows</template>
    <template #message>The table could not refresh.</template>
    <template #actions>
      <button type="button">Retry</button>
    </template>
  </GhostInlineAlert>
</template>
