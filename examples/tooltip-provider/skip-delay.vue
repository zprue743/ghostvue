<script setup lang="ts">
import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipProvider,
  GhostTooltipTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostTooltipProvider :delay-duration="700" :skip-delay-duration="300">
    <div class="tooltip-toolbar">
      <GhostTooltip>
        <GhostTooltipTrigger id="provider-undo">Undo</GhostTooltipTrigger>
        <GhostTooltipContent id="provider-undo-tip">
          Undo the last edit
        </GhostTooltipContent>
      </GhostTooltip>
      <GhostTooltip>
        <GhostTooltipTrigger id="provider-redo">Redo</GhostTooltipTrigger>
        <GhostTooltipContent id="provider-redo-tip">
          Redo the last undone edit
        </GhostTooltipContent>
      </GhostTooltip>
      <GhostTooltip>
        <GhostTooltipTrigger id="provider-save">Save</GhostTooltipTrigger>
        <GhostTooltipContent id="provider-save-tip">
          Save your document
        </GhostTooltipContent>
      </GhostTooltip>
    </div>
  </GhostTooltipProvider>
</template>

<style scoped>
.tooltip-toolbar {
  display: flex;
  gap: 0.5rem;
}
</style>
