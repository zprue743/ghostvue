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
        <GhostTooltipContent id="provider-undo-tip" class="toolbar-tooltip">
          Undo the last edit
        </GhostTooltipContent>
      </GhostTooltip>
      <GhostTooltip>
        <GhostTooltipTrigger id="provider-redo">Redo</GhostTooltipTrigger>
        <GhostTooltipContent id="provider-redo-tip" class="toolbar-tooltip">
          Redo the last undone edit
        </GhostTooltipContent>
      </GhostTooltip>
      <GhostTooltip>
        <GhostTooltipTrigger id="provider-save">Save</GhostTooltipTrigger>
        <GhostTooltipContent id="provider-save-tip" class="toolbar-tooltip">
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

<style>
/*
 * Headless GhostTooltip ships behavior and positioning only, so this sample
 * brings its own consumer CSS. It is unscoped on purpose: the tooltip
 * renders in a body portal, outside this component's scoped attribute, and
 * the prefix keeps the classes from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. The panel
 * only paints a surface; its content keeps its own layout. Nothing animates,
 * so reduced motion needs no override.
 */

/* An opaque, layered label above page content. */
.toolbar-tooltip {
  background-color: var(--ghost-surface-inverse-bg, CanvasText);
  /* Transparent until forced colors draws it, since the fill is dropped. */
  border: 1px solid transparent;
  border-radius: var(--ghost-radius-sm, 0.25rem);
  box-sizing: border-box;
  color: var(--ghost-surface-inverse-fg, Canvas);
  font-size: 0.8125rem;
  line-height: 1.4;
  max-inline-size: min(16rem, calc(100vw - 2rem));
  padding: 0.25rem 0.5rem;
  z-index: 50;
}
</style>
