<script setup lang="ts">
import { shallowRef } from 'vue'

import {
  CalendarDate,
  GhostCalendar,
  GhostCalendarGrid,
  GhostCalendarHeader,
  GhostCalendarHeading,
  GhostCalendarNextButton,
  GhostCalendarPrevButton,
  type GhostCalendarValue,
} from '@ghostvue/vue'

const range = shallowRef<GhostCalendarValue>({
  start: new CalendarDate(2024, 6, 10),
  end: new CalendarDate(2024, 6, 14),
})
const visibleMonth = new CalendarDate(2024, 6, 1)
const today = new CalendarDate(2024, 6, 12)
</script>

<template>
  <div class="calendar-demo">
    <GhostCalendar
      v-model="range"
      selection-mode="range"
      :default-visible-month="visibleMonth"
      :today="today"
    >
      <GhostCalendarHeader>
        <GhostCalendarPrevButton />
        <GhostCalendarHeading />
        <GhostCalendarNextButton />
      </GhostCalendarHeader>
      <GhostCalendarGrid />
    </GhostCalendar>
  </div>
</template>

<style>
/*
 * Headless GhostCalendar ships behavior only, so this sample brings its own
 * consumer CSS. It is unscoped on purpose: the weekday header, weeks and day
 * cells are rendered inside GhostCalendarGrid, where this component's scoped
 * attribute does not reach, and the `calendar-demo` prefix keeps the rules
 * from colliding with page styles. GhostCalendar renders no element of its
 * own, so the sample wraps it in the `.calendar-demo` element. Every headless
 * calendar example carries this same block (a test keeps them identical), so
 * copy it once per app.
 *
 * Colors read GhostVue semantic tokens when a theme is loaded and fall back
 * to CSS system colors, which follow light and dark on their own. The month
 * grid mirrors the themed calendar recipe: one 7-column template shared by
 * the weekday header and every week, and distinct today, selected, range,
 * outside-month and unavailable states that only change color, border or
 * decoration, so the grid never shifts. Nothing animates, so reduced motion
 * needs no override.
 */

/* Fluid up to a comfortable month width, so narrow previews never overflow. */
.calendar-demo {
  box-sizing: border-box;
  color: var(--ghost-surface-fg, CanvasText);
  display: grid;
  gap: 0.5rem;
  inline-size: 100%;
  max-inline-size: 19rem;
}

.calendar-demo [data-part='header'] {
  align-items: center;
  display: flex;
  gap: 0.25rem;
}

/*
 * The heading is a real `<h2>`. Every box and type property is set here so a
 * host page's prose heading styles (margins, rules, large type) cannot leak
 * into the calendar.
 */
.calendar-demo [data-part='heading'] {
  border: 0;
  flex: 1;
  font-size: 0.9375rem;
  font-weight: 600;
  letter-spacing: normal;
  line-height: 1.3;
  margin: 0;
  padding: 0;
  text-align: center;
}

.calendar-demo :is([data-part='prev'], [data-part='next']) {
  background-color: var(--ghost-elevation-1-bg, ButtonFace);
  border: 1px solid var(--ghost-border-strong, ButtonBorder);
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-sizing: border-box;
  color: var(--ghost-surface-fg, ButtonText);
  cursor: pointer;
  font: inherit;
  font-size: 0.8125rem;
  min-block-size: 2.25rem;
  padding: 0 0.5rem;
}

.calendar-demo
  :is([data-part='prev'], [data-part='next']):hover:not(:disabled) {
  background-color: var(--ghost-surface-muted-bg, ButtonFace);
}

.calendar-demo :is([data-part='prev'], [data-part='next']):disabled {
  color: var(--ghost-text-subtle, GrayText);
  cursor: not-allowed;
}

.calendar-demo :is([data-part='prev'], [data-part='next']):focus-visible {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

/* Weekday header and weeks share one 7-column template, so columns align. */
.calendar-demo [data-part='grid'] {
  display: grid;
  gap: 0.125rem;
}

.calendar-demo [data-part='grid'] > [role='row'] {
  display: grid;
  gap: 0.125rem;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-demo [role='columnheader'] {
  color: var(--ghost-text-muted, GrayText);
  font-size: 0.75rem;
  font-weight: 500;
  padding-block: 0.25rem;
  text-align: center;
}

.calendar-demo [data-part='cell'] {
  aspect-ratio: 1;
  background: transparent;
  border: 1px solid transparent;
  border-radius: var(--ghost-radius-md, 0.375rem);
  box-sizing: border-box;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-variant-numeric: tabular-nums;
  padding: 0;
}

/* Zero-specificity hover, so the state fills below always win. */
.calendar-demo
  [data-part='cell']:where(:hover:not(:disabled, [aria-disabled])) {
  background-color: var(--ghost-surface-muted-bg, ButtonFace);
}

/* Adjacent-month days fill the first and last weeks but are not selectable. */
.calendar-demo [data-part='cell'][data-outside-month] {
  color: var(--ghost-text-subtle, GrayText);
  cursor: default;
}

.calendar-demo [data-part='cell'][data-today] {
  border-color: var(--ghost-border-primary, CanvasText);
  color: var(--ghost-text-primary, CanvasText);
  font-weight: 600;
}

/* Unavailable days are struck through: distinct from adjacent-month days. */
.calendar-demo
  [data-part='cell']:is(:disabled, [aria-disabled='true']):not(
    [data-outside-month]
  ) {
  color: var(--ghost-text-subtle, GrayText);
  cursor: not-allowed;
  text-decoration: line-through;
}

.calendar-demo [data-part='cell'][data-state='range-middle'] {
  background-color: var(--ghost-surface-muted-bg, ButtonFace);
  color: var(--ghost-surface-fg, CanvasText);
}

.calendar-demo
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

.calendar-demo [data-part='cell']:focus-visible {
  outline: 2px solid var(--ghost-focus-ring-color, Highlight);
  outline-offset: 2px;
}

/*
 * Forced colors: only today keeps a CanvasText border; inactive days use
 * GrayText. Selected days and range ends become Highlight cells (opted out
 * so HighlightText stays on Highlight); range middles keep a Highlight
 * border so the span still reads.
 */
@media (forced-colors: active) {
  .calendar-demo [data-part='cell'] {
    border-color: Canvas;
  }

  .calendar-demo [data-part='cell']:is(:disabled, [aria-disabled='true']) {
    color: GrayText;
  }

  .calendar-demo [data-part='cell'][data-state='range-middle'] {
    border-color: Highlight;
  }

  /* After the range rule, so today stays marked inside a selected span. */
  .calendar-demo [data-part='cell'][data-today] {
    border-color: CanvasText;
  }

  .calendar-demo
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
