<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostDatePicker,
  GhostDatePickerContent,
  GhostDatePickerInput,
  GhostDatePickerTrigger,
  type GhostDatePickerValue,
} from '@ghostvue/vue'

const due = shallowRef<GhostDatePickerValue>(null)
// An explicit `today` keeps SSR and the first client render identical.
const today = new CalendarDate(2026, 11, 17)
</script>

<template>
  <div class="date-picker-basic">
    <label for="date-picker-basic-due">Due date</label>
    <span class="date-picker-basic__row">
      <GhostDatePicker v-model="due" :today="today" name="due">
        <GhostDatePickerInput
          id="date-picker-basic-due"
          class="date-picker-demo__input"
        />
        <GhostDatePickerTrigger class="date-picker-demo__button" />
        <GhostDatePickerContent class="date-picker-demo__popup" />
      </GhostDatePicker>
    </span>
    <output>
      {{ due instanceof CalendarDate ? due.toString() : 'No date' }}
    </output>
  </div>
</template>

<style scoped>
.date-picker-basic {
  display: grid;
  gap: 0.5rem;
  justify-items: start;
}

.date-picker-basic__row {
  display: inline-flex;
  gap: 0.25rem;
}
</style>

<style>
/*
 * Headless GhostDatePicker ships behavior and positioning only, so this
 * sample brings its own consumer CSS. It is unscoped on purpose: the calendar
 * surface renders in a body portal, outside this component's scoped
 * attribute, and the `date-picker-demo` prefix keeps the classes from
 * colliding with page styles. Every headless date picker example carries
 * this same block (a test keeps them identical), so copy it once per app.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. The month
 * grid mirrors the themed calendar recipe: one 7-column template shared by
 * the weekday header and every week, and distinct today, selected, range,
 * outside-month and unavailable states that only change color, border or
 * decoration, so the grid never shifts. Nothing animates, so reduced motion
 * needs no override.
 */

.date-picker-demo__input {
  background-color: var(--ghost-surface-bg, Field);
  border: 1px solid var(--ghost-border-strong, FieldText);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-sizing: border-box;
  color: var(--ghost-text-default, FieldText);
  font: inherit;
  font-variant-numeric: tabular-nums;
  /* Room for "YYYY-MM-DD" plus padding and borders. */
  inline-size: calc(11ch + 1.5rem + 2px);
  max-inline-size: 100%;
  min-block-size: 2.5rem;
  padding: 0.375rem 0.75rem;
}

.date-picker-demo__input[data-state='invalid'] {
  border-color: var(--ghost-border-danger, CanvasText);
}

.date-picker-demo__input:disabled {
  color: var(--ghost-text-muted, GrayText);
  cursor: not-allowed;
}

/* The calendar trigger and the sample's own buttons share one look. */
.date-picker-demo__button {
  align-items: center;
  background-color: var(--ghost-elevation-1-bg, ButtonFace);
  border: 1px solid var(--ghost-border-strong, ButtonBorder);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-sizing: border-box;
  color: var(--ghost-surface-fg, ButtonText);
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  gap: 0.375rem;
  justify-content: center;
  min-block-size: 2.5rem;
  min-inline-size: 2.5rem;
  padding: 0.375rem 0.75rem;
}

.date-picker-demo__button[data-part='trigger'] {
  padding: 0.375rem;
}

.date-picker-demo__button:hover:not(:disabled),
.date-picker-demo__popup
  :is([data-part='close'], [data-part='prev'], [data-part='next']):hover:not(
    :disabled
  ) {
  background-color: var(--ghost-surface-muted-bg, Canvas);
}

.date-picker-demo__input:focus-visible,
.date-picker-demo__button:focus-visible,
.date-picker-demo__popup button:focus-visible {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

/*
 * An opaque, layered surface above page content. Inline position, left and
 * top come from the picker's floating layer, which anchors the surface to
 * the input; this rule only paints it and caps its width on small screens.
 */
.date-picker-demo__popup {
  background-color: var(--ghost-elevation-3-bg, Canvas);
  border: 1px solid var(--ghost-elevation-3-border, GrayText);
  border-radius: var(--ghost-radius-lg, 0.5rem);
  box-shadow: var(--ghost-elevation-3-shadow, 0 0.5rem 1.5rem rgb(0 0 0 / 20%));
  box-sizing: border-box;
  color: var(--ghost-surface-fg, CanvasText);
  display: grid;
  gap: 0.5rem;
  inline-size: max-content;
  max-inline-size: calc(100vw - 1rem);
  overflow: auto;
  padding: 0.75rem;
  z-index: 50;
}

.date-picker-demo__popup
  :is([data-part='close'], [data-part='prev'], [data-part='next']) {
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ghost-radius-md, 0.375rem);
  color: inherit;
  cursor: pointer;
  font: inherit;
  min-block-size: 2.25rem;
  min-inline-size: 2.25rem;
  padding: 0 0.5rem;
}

.date-picker-demo__popup [data-part='close'] {
  font-size: 1.25rem;
  justify-self: end;
  line-height: 1;
}

.date-picker-demo__popup :is([data-part='prev'], [data-part='next']):disabled {
  color: var(--ghost-text-subtle, GrayText);
  cursor: not-allowed;
}

.date-picker-demo__popup [data-part='header'] {
  align-items: center;
  display: flex;
  gap: 0.25rem;
}

.date-picker-demo__popup [data-part='heading'] {
  flex: 1;
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
  text-align: center;
}

/* Weekday header and weeks share one 7-column template, so columns align. */
.date-picker-demo__popup [data-part='grid'] {
  display: grid;
  gap: 0.125rem;
}

.date-picker-demo__popup [data-part='grid'] > [role='row'] {
  display: grid;
  gap: 0.125rem;
  grid-template-columns: repeat(7, 2.5rem);
}

.date-picker-demo__popup [role='columnheader'] {
  color: var(--ghost-text-muted, GrayText);
  font-size: 0.75rem;
  font-weight: 500;
  padding-block: 0.25rem;
  text-align: center;
}

.date-picker-demo__popup [data-part='cell'] {
  aspect-ratio: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ghost-radius-md, 0.375rem);
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-variant-numeric: tabular-nums;
  /* A transparent outline turns into a visible ring under forced colors. */
  outline: 2px solid transparent;
  outline-offset: -2px;
  padding: 0;
}

/* Zero-specificity hover, so the state fills below always win. */
.date-picker-demo__popup
  [data-part='cell']:where(:hover:not(:disabled, [aria-disabled])) {
  background-color: var(--ghost-surface-muted-bg, Canvas);
}

/* Adjacent-month days fill the first and last weeks but are not selectable. */
.date-picker-demo__popup [data-part='cell'][data-outside-month] {
  color: var(--ghost-text-subtle, GrayText);
  cursor: default;
}

.date-picker-demo__popup [data-part='cell'][data-today] {
  border-color: var(--ghost-border-primary, CanvasText);
  color: var(--ghost-text-primary, CanvasText);
  font-weight: 600;
}

/* Unavailable days are struck through: distinct from adjacent-month days. */
.date-picker-demo__popup
  [data-part='cell']:is(:disabled, [aria-disabled='true']):not(
    [data-outside-month]
  ) {
  color: var(--ghost-text-subtle, GrayText);
  cursor: not-allowed;
  text-decoration: line-through;
}

.date-picker-demo__popup [data-part='cell'][data-state='range-middle'] {
  background-color: var(--ghost-surface-muted-bg, Canvas);
  color: var(--ghost-surface-fg, CanvasText);
}

.date-picker-demo__popup
  [data-part='cell']:is(
    [data-state='selected'],
    [data-state='range-start'],
    [data-state='range-end']
  ) {
  background-color: var(--ghost-action-primary-bg, Highlight);
  border-color: var(--ghost-action-primary-border, Highlight);
  color: var(--ghost-action-primary-fg, HighlightText);
  font-weight: 600;
}

.date-picker-demo__popup [data-part='cell']:focus-visible {
  outline-color: var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

.date-picker-demo__popup [data-part='error-summary'] {
  color: var(--ghost-status-danger-fg, CanvasText);
  font-size: 0.875rem;
}

.date-picker-demo__popup
  :is([data-part='error-summary'] p, [data-part='status']) {
  margin: 0;
}

.date-picker-demo__popup [data-part='status'] {
  color: var(--ghost-text-muted, GrayText);
  font-size: 0.875rem;
  max-inline-size: calc(7 * 2.5rem + 6 * 0.125rem);
  min-block-size: 1lh;
}

/*
 * Forced colors: only today keeps a CanvasText border; inactive days use
 * GrayText. Selected days and range ends become Highlight cells (opted out
 * so HighlightText stays on Highlight); range middles keep a Highlight
 * border so the span still reads.
 */
@media (forced-colors: active) {
  .date-picker-demo__popup {
    border-color: CanvasText;
  }

  .date-picker-demo__popup [data-part='cell'] {
    border-color: Canvas;
  }

  .date-picker-demo__popup [data-part='cell'][data-today] {
    border-color: CanvasText;
  }

  .date-picker-demo__popup
    [data-part='cell']:is(:disabled, [aria-disabled='true']) {
    color: GrayText;
  }

  .date-picker-demo__popup [data-part='cell'][data-state='range-middle'] {
    border-color: Highlight;
  }

  .date-picker-demo__popup
    [data-part='cell']:is(
      [data-state='selected'],
      [data-state='range-start'],
      [data-state='range-end']
    ) {
    background-color: Highlight;
    border-color: Highlight;
    color: HighlightText;
    forced-color-adjust: none;
  }
}
</style>
