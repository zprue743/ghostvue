<script setup lang="ts">
import {
  GhostPopover,
  GhostPopoverClose,
  GhostPopoverContent,
  GhostPopoverTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostPopover>
    <GhostPopoverTrigger>Toggle details</GhostPopoverTrigger>
    <GhostPopoverContent :offset="8">
      <p>Non-modal disclosure content anchored to the trigger.</p>
      <GhostPopoverClose>Close</GhostPopoverClose>
    </GhostPopoverContent>
  </GhostPopover>
</template>
