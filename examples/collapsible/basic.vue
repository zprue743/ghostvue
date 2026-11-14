<script setup lang="ts">
import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostCollapsible>
    <GhostCollapsibleTrigger>Show fulfillment trace</GhostCollapsibleTrigger>
    <GhostCollapsibleContent>
      <p>
        Carrier scan events stay in document order for assistive technology.
      </p>
    </GhostCollapsibleContent>
  </GhostCollapsible>
</template>
