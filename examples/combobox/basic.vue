<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxInput,
  GhostComboboxOption,
} from '@ghostvue/vue'

const fruit = ref('banana')
</script>

<template>
  <GhostCombobox v-model="fruit" data-testid="combobox-basic">
    <GhostComboboxInput
      data-testid="combobox-basic-input"
      aria-label="Pick a fruit"
      placeholder="Type to search fruits"
    />
    <GhostComboboxContent
      class="fruit-combobox__list"
      placement="bottom-start"
      :offset="6"
      data-testid="combobox-basic-content"
    >
      <GhostComboboxOption value="apple" text-value="Apple"
        >Apple</GhostComboboxOption
      >
      <GhostComboboxOption value="banana" text-value="Banana"
        >Banana</GhostComboboxOption
      >
      <GhostComboboxOption value="orange" text-value="Orange"
        >Orange</GhostComboboxOption
      >
    </GhostComboboxContent>
  </GhostCombobox>
</template>

<style>
/*
 * Headless GhostCombobox ships behavior and positioning only, so this sample
 * brings its own consumer CSS. It is unscoped on purpose: the list renders
 * in a body portal, outside this component's scoped attribute, and the
 * prefix keeps the classes from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. Rows keep
 * fixed geometry: highlight, selection and disabled only change color or the
 * check mark's visibility, so the list never shifts. The highlight follows
 * `data-highlighted`, because focus stays in the input. Nothing animates, so
 * reduced motion needs no override.
 */

/* An opaque, layered panel above page content. */
.fruit-combobox__list {
  background-color: var(--ghost-elevation-3-bg, Canvas);
  border: 1px solid var(--ghost-elevation-3-border, GrayText);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-shadow: var(--ghost-elevation-3-shadow, 0 0.5rem 1.5rem rgb(0 0 0 / 20%));
  box-sizing: border-box;
  color: var(--ghost-surface-fg, CanvasText);
  max-block-size: min(18rem, calc(100dvh - 2rem));
  max-inline-size: calc(100vw - 2rem);
  min-inline-size: 11rem;
  overflow: auto;
  padding: 0.25rem;
  z-index: 50;
}

.fruit-combobox__list [role='option'] {
  border-radius: var(--ghost-radius-sm, 0.25rem);
  cursor: default;
  /* A transparent outline turns into a visible ring under forced colors. */
  outline: 2px solid transparent;
  outline-offset: -2px;
  padding: 0.375rem 0.75rem 0.375rem 1.75rem;
  position: relative;
}

/* Check mark slot, shown only on the checked row. */
.fruit-combobox__list [role='option']::before {
  block-size: 0.55rem;
  border-block-end: 2px solid currentColor;
  border-inline-end: 2px solid currentColor;
  content: '';
  inline-size: 0.3rem;
  inset-block-start: 50%;
  inset-inline-start: 0.7rem;
  position: absolute;
  transform: translateY(-65%) rotate(45deg);
  visibility: hidden;
}

.fruit-combobox__list [role='option'][aria-selected='true'] {
  font-weight: 600;
}

.fruit-combobox__list [role='option'][aria-selected='true']::before {
  visibility: visible;
}

/* Keyboard highlight. */
.fruit-combobox__list [role='option'][data-highlighted] {
  background-color: var(--ghost-action-primary-bg, Highlight);
  color: var(--ghost-action-primary-fg, HighlightText);
}

.fruit-combobox__list [role='option'][aria-disabled='true'] {
  color: var(--ghost-text-muted, GrayText);
  cursor: not-allowed;
}

.fruit-combobox__list [data-part='empty'] {
  color: var(--ghost-text-muted, GrayText);
  padding: 0.375rem 0.75rem;
}

@media (forced-colors: active) {
  .fruit-combobox__list [role='option'][data-highlighted] {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }

  .fruit-combobox__list [role='option'][aria-disabled='true'] {
    color: GrayText;
  }
}
</style>
