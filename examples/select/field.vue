<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostField,
  GhostFieldControl,
  GhostFieldDescription,
  GhostFieldLabel,
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
} from '@ghostvue/vue'

const operator = ref<string | undefined>(undefined)
</script>

<template>
  <GhostField required>
    <GhostFieldLabel>Filter operator</GhostFieldLabel>
    <GhostFieldDescription>How values are compared.</GhostFieldDescription>
    <GhostFieldControl v-slot="field">
      <GhostSelect v-model="operator" placeholder="Choose operator">
        <GhostSelectTrigger class="operator-select__trigger" v-bind="field">
          <GhostSelectValue />
        </GhostSelectTrigger>
        <GhostSelectContent
          class="operator-select__list"
          :portal="false"
          placement="bottom-start"
          :offset="6"
        >
          <GhostSelectOption value="eq">Equals</GhostSelectOption>
          <GhostSelectOption value="contains">Contains</GhostSelectOption>
          <GhostSelectOption value="starts">Starts with</GhostSelectOption>
        </GhostSelectContent>
      </GhostSelect>
    </GhostFieldControl>
  </GhostField>
</template>

<style>
/*
 * Headless GhostSelect ships behavior and positioning only, so this sample
 * brings its own consumer CSS. It is unscoped on purpose: the list renders
 * inline (`:portal="false"`) as a child component's root, which does not
 * carry this component's scoped attribute, and the prefix keeps the classes
 * from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. Options
 * keep fixed geometry: highlight, hover, selection and disabled only change
 * color or the check mark's visibility, so the list never shifts. Nothing
 * animates, so reduced motion needs no override.
 */

.operator-select__trigger {
  align-items: center;
  background-color: var(--ghost-surface-bg, Field);
  border: 1px solid var(--ghost-border-strong, ButtonBorder);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-sizing: border-box;
  color: var(--ghost-text-default, FieldText);
  cursor: default;
  display: inline-flex;
  font: inherit;
  gap: 0.75rem;
  justify-content: space-between;
  min-inline-size: 11rem;
  padding: 0.375rem 0.75rem;
}

/* Decorative chevron; generated boxes add nothing to the accessible name. */
.operator-select__trigger::after {
  block-size: 0.4rem;
  border-block-end: 2px solid currentColor;
  border-inline-end: 2px solid currentColor;
  content: '';
  flex: none;
  inline-size: 0.4rem;
  transform: translateY(-25%) rotate(45deg);
}

.operator-select__trigger[data-state='open']::after {
  transform: translateY(25%) rotate(225deg);
}

.operator-select__trigger:focus-visible {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

/* The placeholder reads as a hint until a value is chosen. */
.operator-select__trigger > [data-part='value']:not([data-state]) {
  color: var(--ghost-text-muted, GrayText);
}

/* An opaque, layered panel above page content. */
.operator-select__list {
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

.operator-select__list [role='option'] {
  border-radius: var(--ghost-radius-sm, 0.25rem);
  cursor: default;
  /* A transparent outline turns into a visible ring under forced colors. */
  outline: 2px solid transparent;
  outline-offset: -2px;
  padding: 0.375rem 0.75rem 0.375rem 1.75rem;
  position: relative;
}

/* Check mark slot, shown only on the selected option. */
.operator-select__list [role='option']::before {
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

.operator-select__list [role='option'][aria-selected='true'] {
  font-weight: 600;
}

.operator-select__list [role='option'][aria-selected='true']::before {
  visibility: visible;
}

.operator-select__list [role='option']:hover:not([aria-disabled='true']) {
  background-color: var(--ghost-surface-muted-bg, Canvas);
}

/* Keyboard highlight: the option that holds focus inside the list. */
.operator-select__list [role='option']:focus {
  background-color: var(--ghost-action-primary-bg, Highlight);
  color: var(--ghost-action-primary-fg, HighlightText);
}

.operator-select__list [role='option'][aria-disabled='true'] {
  color: var(--ghost-text-muted, GrayText);
  cursor: not-allowed;
}

@media (forced-colors: active) {
  .operator-select__list [role='option']:focus {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }

  .operator-select__list [role='option'][aria-disabled='true'] {
    color: GrayText;
  }
}
</style>
