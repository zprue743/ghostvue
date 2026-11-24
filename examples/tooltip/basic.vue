<script setup lang="ts">
import {
  GhostTooltip,
  GhostTooltipContent,
  GhostTooltipTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostTooltip :delay-duration="300" :close-delay="150">
    <GhostTooltipTrigger aria-label="Archive row">
      <span aria-hidden="true">📦</span>
    </GhostTooltipTrigger>
    <GhostTooltipContent class="archive-tooltip" :offset="6">
      Move this dataset to long-term archive storage.
    </GhostTooltipContent>
  </GhostTooltip>
</template>

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
.archive-tooltip {
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
