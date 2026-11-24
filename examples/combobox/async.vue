<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCombobox,
  GhostComboboxContent,
  GhostComboboxEmpty,
  GhostComboboxInput,
  GhostComboboxOption,
  useGhostComboboxAsyncSearch,
} from '@ghostvue/vue'

const loading = ref(false)
const options = ref<{ value: string; label: string }[]>([
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
])

const { begin, isLatest } = useGhostComboboxAsyncSearch()

const source = [
  { value: 'apple', label: 'Apple' },
  { value: 'banana', label: 'Banana' },
  { value: 'orange', label: 'Orange' },
  { value: 'grape', label: 'Grape' },
]

async function onSearch(payload: { query: string; requestId: number }) {
  const { query, requestId } = payload
  begin(requestId)
  loading.value = true
  await new Promise((resolve) => setTimeout(resolve, 200))
  if (!isLatest(requestId)) {
    return
  }
  const lowered = query.toLowerCase()
  options.value = source.filter((entry) =>
    entry.label.toLowerCase().includes(lowered),
  )
  loading.value = false
}
</script>

<template>
  <GhostCombobox :loading="loading" @search="onSearch">
    <GhostComboboxInput
      aria-label="Search fruits"
      placeholder="Search async list"
    />
    <GhostComboboxContent
      class="async-fruit-combobox__list"
      :portal="false"
      placement="bottom-start"
      :offset="6"
    >
      <GhostComboboxOption
        v-for="option in options"
        :key="option.value"
        :value="option.value"
        :text-value="option.label"
      >
        {{ option.label }}
      </GhostComboboxOption>
      <GhostComboboxEmpty>No matches</GhostComboboxEmpty>
    </GhostComboboxContent>
  </GhostCombobox>
</template>

<style>
/*
 * Headless GhostCombobox ships behavior and positioning only, so this sample
 * brings its own consumer CSS. It is unscoped on purpose: the list renders
 * inline (`:portal="false"`) as a child component's root, which does not
 * carry this component's scoped attribute, and the prefix keeps the classes
 * from colliding with page styles.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. Rows keep
 * fixed geometry: highlight, selection and disabled only change color or the
 * check mark's visibility, so the list never shifts. The highlight follows
 * `data-highlighted`, because focus stays in the input. Nothing animates, so
 * reduced motion needs no override.
 */

/* An opaque, layered panel above page content. */
.async-fruit-combobox__list {
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

.async-fruit-combobox__list [role='option'] {
  border-radius: var(--ghost-radius-sm, 0.25rem);
  cursor: default;
  /* A transparent outline turns into a visible ring under forced colors. */
  outline: 2px solid transparent;
  outline-offset: -2px;
  padding: 0.375rem 0.75rem 0.375rem 1.75rem;
  position: relative;
}

/* Check mark slot, shown only on the checked row. */
.async-fruit-combobox__list [role='option']::before {
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

.async-fruit-combobox__list [role='option'][aria-selected='true'] {
  font-weight: 600;
}

.async-fruit-combobox__list [role='option'][aria-selected='true']::before {
  visibility: visible;
}

/* Keyboard highlight. */
.async-fruit-combobox__list [role='option'][data-highlighted] {
  background-color: var(--ghost-action-primary-bg, Highlight);
  color: var(--ghost-action-primary-fg, HighlightText);
}

.async-fruit-combobox__list [role='option'][aria-disabled='true'] {
  color: var(--ghost-text-muted, GrayText);
  cursor: not-allowed;
}

.async-fruit-combobox__list [data-part='empty'] {
  color: var(--ghost-text-muted, GrayText);
  padding: 0.375rem 0.75rem;
}

@media (forced-colors: active) {
  .async-fruit-combobox__list [role='option'][data-highlighted] {
    background-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }

  .async-fruit-combobox__list [role='option'][aria-disabled='true'] {
    color: GrayText;
  }
}
</style>
