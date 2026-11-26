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

The themed `GhostCalendar` renders a `.ghost-themed-scope` container (consumer
`class` and `style` land on it), so the recipe styles every part without a
page-level `.ghost-theme`. Week rows and the weekday header share seven
equal-width columns; leading and trailing days from adjacent months fill the
first and last weeks in a muted color. Today, selected, range, hover,
focus-visible, unavailable (struck through), and outside-month dates each have
a distinct style, including in forced colors. Day cells and navigation buttons
reach the 44px touch target when the container is wide enough.

Themed `GhostCalendarPrevButton` and `GhostCalendarNextButton` render a
decorative chevron by default and keep their accessible names
(`Previous month`, `Next month`); pass slot content to replace the icon. The
example groups a Today button with the navigation inside
`GhostCalendarHeader`. Pass `today` when you need deterministic “today”
styling in SSR, tests, or snapshots. The today cell also carries
`aria-current="date"`.

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

`locale` drives `Intl` labels and the first day of the week (Sunday for
`en-US`, Monday for `en-GB`); override week layout with `week-starts-on`
(0 = Sunday).

## API

See the [specification](/specs/calendar). Generated manifest data lives under
`packages/vue/manifests/ghost-calendar.manifest.json` and themed
`packages/themes/manifests/ghost-calendar.manifest.json`.

<!-- @generated docs-api:vue/ghost-calendar begin -->

<!-- Source: packages/vue/manifests/ghost-calendar.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop                  | Type                                | Default    | Description                          |
| --------------------- | ----------------------------------- | ---------- | ------------------------------------ |
| `defaultValue`        | `GhostCalendarValue`                | —          | Declared prop `defaultValue`.        |
| `defaultVisibleMonth` | `CalendarDate`                      | —          | Declared prop `defaultVisibleMonth`. |
| `disabled`            | `boolean`                           | `false`    | Declared prop `disabled`.            |
| `isDateDisabled`      | `((date: CalendarDate) => boolean)` | —          | Declared prop `isDateDisabled`.      |
| `locale`              | `string`                            | `"en-US"`  | Declared prop `locale`.              |
| `maxValue`            | `CalendarDate`                      | —          | Declared prop `maxValue`.            |
| `minValue`            | `CalendarDate`                      | —          | Declared prop `minValue`.            |
| `modelValue`          | `GhostCalendarValue \| null`        | —          | Declared prop `modelValue`.          |
| `selectionMode`       | `GhostCalendarSelectionMode`        | `"single"` | Declared prop `selectionMode`.       |
| `today`               | `CalendarDate`                      | —          | Declared prop `today`.               |
| `visibleMonth`        | `CalendarDate`                      | —          | Declared prop `visibleMonth`.        |
| `weekStartsOn`        | `number`                            | —          | Declared prop `weekStartsOn`.        |

| Event    | Payload        | Description          |
| -------- | -------------- | -------------------- |
| `select` | `CalendarDate` | Emitted as `select`. |

| Slot      | Slot props                                                                                                  | Description        |
| --------- | ----------------------------------------------------------------------------------------------------------- | ------------------ |
| `default` | `modelValue: GhostCalendarValue`, `selectionMode: GhostCalendarSelectionMode`, `visibleMonth: CalendarDate` | Container content. |

<!-- @generated docs-api:vue/ghost-calendar end -->

<!-- @generated docs-api:themes/ghost-calendar begin -->

<!-- Source: packages/themes/manifests/ghost-calendar.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostCalendar` API, which it forwards.

<!-- @generated docs-api:themes/ghost-calendar end -->

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
