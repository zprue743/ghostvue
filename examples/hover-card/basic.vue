<script setup lang="ts">
import {
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <div class="hover-card-basic">
    <GhostHoverCard :open-delay="300" :close-delay="150">
      <GhostHoverCardTrigger
        class="hover-card-basic__trigger"
        aria-label="Contributor profile preview"
      >
        @ghostvue
      </GhostHoverCardTrigger>
      <GhostHoverCardContent
        class="hover-card-basic__panel"
        placement="bottom-start"
        :offset="8"
        :shift="{ padding: 16 }"
      >
        <p class="hover-card-basic__text">
          <strong>GhostVue</strong> — headless Vue primitives.
        </p>
        <a
          class="hover-card-basic__link"
          href="https://github.com/zprue743/ghostvue"
        >
          View repository
        </a>
      </GhostHoverCardContent>
    </GhostHoverCard>
  </div>
</template>

<style scoped>
/*
 * Reserve room below the trigger for the open card (two short lines plus
 * the 8px offset), so it opens inside the preview area instead of over the
 * content that follows. The card itself still portals and layers on top.
 */
.hover-card-basic {
  display: inline-block;
  padding-block-end: 6rem;
}
</style>

<style>
/*
 * Headless GhostHoverCard ships behavior and positioning only, so this
 * sample brings its own consumer CSS. It is unscoped on purpose: the card
 * renders in a body portal, outside this component's scoped attribute, and
 * the prefix keeps the classes from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. Forced
 * colors repaint every surface and border with system colors, so no override
 * is needed there. Nothing animates, so reduced motion needs no override.
 */

/* The trigger reads as a mention chip, not a bare native button. */
.hover-card-basic__trigger {
  align-items: center;
  background-color: var(--ghost-surface-bg, ButtonFace);
  border: 1px solid var(--ghost-border-strong, ButtonBorder);
  border-radius: 999px;
  box-sizing: border-box;
  color: var(--ghost-text-primary, ButtonText);
  cursor: default;
  display: inline-flex;
  font: inherit;
  font-weight: var(--ghost-type-weight-medium, 500);
  line-height: 1.25;
  padding: 0.25rem 0.75rem;
}

.hover-card-basic__trigger:focus-visible {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

/*
 * An opaque, layered panel above page content. `bottom-start` keeps the
 * card aligned with the trigger's start edge, inside the example frame, and
 * the shift padding keeps a gutter from the viewport edge on narrow screens.
 */
.hover-card-basic__panel {
  background-color: var(--ghost-elevation-3-bg, Canvas);
  border: 1px solid var(--ghost-elevation-3-border, GrayText);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-shadow: var(--ghost-elevation-3-shadow, 0 0.5rem 1.5rem rgb(0 0 0 / 20%));
  box-sizing: border-box;
  color: var(--ghost-surface-fg, CanvasText);
  display: grid;
  gap: 0.375rem;
  max-inline-size: min(20rem, calc(100vw - 2rem));
  min-inline-size: 0;
  padding: 0.75rem 1rem;
  z-index: 50;
}

/* Docs prose and app resets may give paragraphs margins; the gap owns spacing. */
.hover-card-basic__text {
  margin: 0;
}

.hover-card-basic__link {
  color: var(--ghost-text-primary, LinkText);
  justify-self: start;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.hover-card-basic__link:focus-visible {
  border-radius: var(--ghost-radius-sm, 0.25rem);
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}
</style>
