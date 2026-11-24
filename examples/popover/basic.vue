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
    <GhostPopoverContent
      class="details-popover"
      placement="bottom-start"
      :offset="8"
    >
      <p>Non-modal disclosure content anchored to the trigger.</p>
      <GhostPopoverClose>Close</GhostPopoverClose>
    </GhostPopoverContent>
  </GhostPopover>
</template>

<style>
/*
 * Headless GhostPopover ships behavior and positioning only, so this sample
 * brings its own consumer CSS. It is unscoped on purpose: the panel renders
 * in a body portal, outside this component's scoped attribute, and the
 * prefix keeps the classes from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. The panel
 * only paints a surface; its content keeps its own layout. Nothing animates,
 * so reduced motion needs no override.
 */

/* An opaque, layered panel above page content. */
.details-popover {
  background-color: var(--ghost-elevation-3-bg, Canvas);
  border: 1px solid var(--ghost-elevation-3-border, GrayText);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-shadow: var(--ghost-elevation-3-shadow, 0 0.5rem 1.5rem rgb(0 0 0 / 20%));
  box-sizing: border-box;
  color: var(--ghost-surface-fg, CanvasText);
  max-inline-size: min(20rem, calc(100vw - 2rem));
  min-inline-size: 0;
  padding: 0.75rem 1rem;
  z-index: 50;
}

.details-popover > p {
  margin: 0 0 0.5rem;
}
</style>
