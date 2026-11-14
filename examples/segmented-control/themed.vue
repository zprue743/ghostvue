<script setup lang="ts">
import {
  GhostSegmentedControl,
  GhostSegmentedControlItem,
} from '@ghostvue/themes'
</script>

<template>
  <GhostSegmentedControl default-value="week" aria-label="Time range">
    <GhostSegmentedControlItem value="day">Day</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="week">Week</GhostSegmentedControlItem>
    <GhostSegmentedControlItem value="month">Month</GhostSegmentedControlItem>
  </GhostSegmentedControl>
</template>
