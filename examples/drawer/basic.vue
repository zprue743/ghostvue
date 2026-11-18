<script setup lang="ts">
import {
  GhostDrawer,
  GhostDrawerClose,
  GhostDrawerContent,
  GhostDrawerDescription,
  GhostDrawerOverlay,
  GhostDrawerTitle,
  GhostDrawerTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostDrawer>
    <GhostDrawerTrigger>Open filters</GhostDrawerTrigger>
    <GhostDrawerOverlay />
    <GhostDrawerContent>
      <GhostDrawerTitle>Filters</GhostDrawerTitle>
      <GhostDrawerDescription>
        Narrow the order list by status and region.
      </GhostDrawerDescription>
      <GhostDrawerClose>Close</GhostDrawerClose>
    </GhostDrawerContent>
  </GhostDrawer>
</template>
