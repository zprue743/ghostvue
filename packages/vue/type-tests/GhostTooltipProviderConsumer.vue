<script setup lang="ts">
import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipProvider,
  GhostTooltipTrigger,
  type GhostTooltipProviderProps,
} from '../src'

const providerProps: GhostTooltipProviderProps = {
  delayDuration: 500,
  skipDelayDuration: 250,
}
void providerProps
</script>

<template>
  <GhostTooltipProvider v-bind="providerProps">
    <GhostTooltip>
      <GhostTooltipTrigger>Save</GhostTooltipTrigger>
      <GhostTooltipContent>Writes changes</GhostTooltipContent>
    </GhostTooltip>
    <GhostTooltip :delay-duration="200">
      <GhostTooltipTrigger>Reset</GhostTooltipTrigger>
      <GhostTooltipContent>Discards draft</GhostTooltipContent>
    </GhostTooltip>
  </GhostTooltipProvider>
</template>
