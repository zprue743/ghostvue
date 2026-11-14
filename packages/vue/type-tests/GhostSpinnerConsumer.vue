<script setup lang="ts">
import { GhostSpinner } from '../src'

function handleClick(event: MouseEvent) {
  event.preventDefault()
}
</script>

<template>
  <GhostSpinner
    id="table-pending"
    class="dense"
    lang="en"
    title="Pending"
    aria-label="Refreshing reports"
    data-tone="neutral"
    @click="handleClick"
  />
</template>
