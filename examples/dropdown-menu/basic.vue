<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostDropdownMenu,
  GhostDropdownMenuCheckboxItem,
  GhostDropdownMenuContent,
  GhostDropdownMenuItem,
  GhostDropdownMenuLabel,
  GhostDropdownMenuRadioGroup,
  GhostDropdownMenuRadioItem,
  GhostDropdownMenuSeparator,
  GhostDropdownMenuTrigger,
} from '@ghostvue/vue'

const showHidden = ref(false)
const sort = ref('name')
</script>

<template>
  <GhostDropdownMenu>
    <GhostDropdownMenuTrigger>File actions</GhostDropdownMenuTrigger>
    <GhostDropdownMenuContent
      class="file-actions-menu"
      :offset="8"
      placement="bottom-start"
    >
      <GhostDropdownMenuLabel>Actions</GhostDropdownMenuLabel>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuItem>Edit</GhostDropdownMenuItem>
      <GhostDropdownMenuItem disabled>Archive (disabled)</GhostDropdownMenuItem>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuCheckboxItem v-model:checked="showHidden">
        Show hidden files
      </GhostDropdownMenuCheckboxItem>
      <GhostDropdownMenuSeparator decorative />
      <GhostDropdownMenuRadioGroup v-model="sort">
        <GhostDropdownMenuRadioItem value="name">
          Sort by name
        </GhostDropdownMenuRadioItem>
        <GhostDropdownMenuRadioItem value="date">
          Sort by date
        </GhostDropdownMenuRadioItem>
      </GhostDropdownMenuRadioGroup>
    </GhostDropdownMenuContent>
  </GhostDropdownMenu>
</template>

<style>
/*
 * Headless GhostDropdownMenu ships behavior and positioning only, so this
 * sample brings its own consumer CSS. It is unscoped on purpose: the menu
 * renders in a body portal, outside this component's scoped attribute, and
 * the prefix keeps the classes from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. Items keep
 * fixed geometry: highlight, hover, checked and disabled states only change
 * color or a mark's visibility, so the menu never shifts. The highlight
 * follows focus, which roves through the items. Nothing animates, so reduced
 * motion needs no override.
 */

/* An opaque, layered panel above page content. */
.file-actions-menu {
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

.file-actions-menu
  :is([role='menuitem'], [role='menuitemcheckbox'], [role='menuitemradio']) {
  border-radius: var(--ghost-radius-sm, 0.25rem);
  cursor: default;
  /* A transparent outline turns into a visible ring under forced colors. */
  outline: 2px solid transparent;
  outline-offset: -2px;
  padding: 0.375rem 0.75rem 0.375rem 1.75rem;
  position: relative;
}

/* Check mark slot, shown only on the checked row. */
.file-actions-menu
  :is(
    [role='menuitem'],
    [role='menuitemcheckbox'],
    [role='menuitemradio']
  )::before {
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

.file-actions-menu
  :is(
    [role='menuitem'],
    [role='menuitemcheckbox'],
    [role='menuitemradio']
  )[aria-checked='true'] {
  font-weight: 600;
}

.file-actions-menu
  :is(
    [role='menuitem'],
    [role='menuitemcheckbox'],
    [role='menuitemradio']
  )[aria-checked='true']::before {
  visibility: visible;
}

/* Radio rows show a dot instead of a check. */
.file-actions-menu [role='menuitemradio']::before {
  block-size: 0;
  border: 0.2rem solid currentColor;
  border-radius: 50%;
  inline-size: 0;
  transform: translateY(-50%);
}

.file-actions-menu
  :is(
    [role='menuitem'],
    [role='menuitemcheckbox'],
    [role='menuitemradio']
  ):hover:not(
    :is(
      [role='menuitem'],
      [role='menuitemcheckbox'],
      [role='menuitemradio']
    )[aria-disabled='true']
  ) {
  background-color: var(--ghost-surface-muted-bg, Canvas);
}

/* Keyboard highlight. */
.file-actions-menu
  :is(
    [role='menuitem'],
    [role='menuitemcheckbox'],
    [role='menuitemradio']
  ):focus {
  background-color: var(--ghost-action-primary-bg, Highlight);
  color: var(--ghost-action-primary-fg, HighlightText);
}

.file-actions-menu
  :is(
    [role='menuitem'],
    [role='menuitemcheckbox'],
    [role='menuitemradio']
  )[aria-disabled='true'] {
  color: var(--ghost-text-muted, GrayText);
  cursor: not-allowed;
}

.file-actions-menu [data-part='label'] {
  color: var(--ghost-text-muted, GrayText);
  font-size: 0.8125rem;
  padding: 0.375rem 0.75rem 0.25rem 1.75rem;
}

.file-actions-menu [data-part='separator'] {
  border-block-start: 1px solid var(--ghost-border-default, GrayText);
  margin-block: 0.25rem;
}

@media (forced-colors: active) {
  .file-actions-menu
    :is(
      [role='menuitem'],
      [role='menuitemcheckbox'],
      [role='menuitemradio']
    ):focus {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }

  .file-actions-menu
    :is(
      [role='menuitem'],
      [role='menuitemcheckbox'],
      [role='menuitemradio']
    )[aria-disabled='true'] {
    color: GrayText;
  }
}
</style>
