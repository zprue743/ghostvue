# GhostCalendar

`GhostCalendar` implements a locale-aware month grid for single-date or range
selection, following the WAI-ARIA APG date-picker dialog grid keyboard model.
Import the compound parts from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for default surfaces.

Values are [`CalendarDate`](https://react-spectrum.adobe.com/internationalized/date/CalendarDate.html)
objects from `@internationalized/date` (shipped as a runtime dependency of
`@ghostvue/vue`). Use `date.toString()` for ISO `YYYY-MM-DD` strings and
`parseDate(iso)` when reading user input.

<GhostExample id="calendar/themed" />

Themed parts set `data-themed` so calendar CSS applies under `.ghost-theme` or
`.ghost-themed-scope`. Pass `today` when you need deterministic “today” styling
in SSR, tests, or snapshots.

## Basic use

<GhostExample id="calendar/basic" />

When `today` is omitted, no implicit runtime clock is used during render.

## Range selection

<GhostExample id="calendar/range" />

Set `selection-mode="range"` and bind `v-model` to `{ start, end }` (inclusive).
A third activation starts a new range.

## Activation events and controlled empty

`GhostCalendar` emits `select` with the activated `CalendarDate` once for every
accepted activation, after `update:modelValue`. It also fires when the date is
already selected, so a wrapper can tell the first range click from a completed
one-day range (both propose `{ start: day, end: day }`). Disabled, unavailable,
and outside-month dates emit nothing. `useGhostCalendar` exposes the same hook
as `onSelect`.

Bind `:model-value="null"` to keep the calendar controlled while empty.
`undefined` (or omitting the prop) still means uncontrolled. While the value is
`null`, `defaultValue` is ignored, slots report `modelValue` as `undefined`,
and `update:modelValue` proposals change nothing until the parent applies
them. Resetting the bound value to `null` clears a pending range start.

```vue
<GhostCalendar
  :model-value="display"
  selection-mode="range"
  @select="onActivate"
>
  <GhostCalendarGrid />
</GhostCalendar>
```

## Controlled month

<GhostExample id="calendar/controlled" />

`v-model:visible-month` controls which month is displayed. Combine with
`min-value` / `max-value` and `is-date-disabled` for business rules.

## Locale

<GhostExample id="calendar/locale" />

`locale` drives `Intl` labels; override week layout with `week-starts-on`
(0 = Sunday).

## API

See the [specification](/specs/calendar). Generated manifest data lives under
`packages/vue/manifests/ghost-calendar.manifest.json` and themed
`packages/themes/manifests/ghost-calendar.manifest.json`.

| Part                      | Role       | Key attributes                         |
| ------------------------- | ---------- | -------------------------------------- |
| `GhostCalendar`           | —          | `v-model`, `selectionMode`, `locale`   |
| `GhostCalendarGrid`       | `grid`     | `aria-labelledby`, keyboard navigation |
| `GhostCalendarCell`       | `gridcell` | `date`, `aria-selected`, `data-state`  |
| `GhostCalendarPrevButton` | `button`   | Previous month                         |
| `GhostCalendarNextButton` | `button`   | Next month                             |

## Accessibility

Keyboard support on the grid includes arrow keys (day/week), Home/End (week
boundaries), Page Up/Down (month), and Shift+Page Up/Down (year). The focused
date uses roving `tabindex`. See [the calendar specification](/specs/calendar#keyboard-interaction-on-grid-with-focus-inside).
