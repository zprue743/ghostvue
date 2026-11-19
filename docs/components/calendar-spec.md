# GhostCalendar specification

**Status:** Proposed for GHO-102. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostCalendar` is a month-grid date surface for choosing one date or a range
without an attached text field or popover. Applications need locale-aware week
layout, min/max and custom disabled dates, keyboard navigation that matches the
WAI-ARIA APG **Date Picker Dialog** grid, and values that serialize predictably
for forms and APIs. The compound headless API mirrors other GhostVue families so
a future `GhostDatePicker` (GHO-103) can embed the same grid in an overlay.

## Non-goals

- Text input, popover, or dialog chrome (`GhostDatePicker` / `GhostPopover`).
- Time-of-day or time-zone conversion (use `CalendarDate` only; no `Time` picker).
- Multi-month carousels, infinite scroll, or virtualization.
- iCalendar import/export or scheduling recurrence.
- Replacing consumer-owned business rules beyond `minValue`, `maxValue`, and
  `isDateDisabled`.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostCalendar` (root state and context provider; renderless)
- `GhostCalendarHeader` (layout region for heading and navigation)
- `GhostCalendarHeading` (visible month/year label)
- `GhostCalendarPrevButton` (previous month control)
- `GhostCalendarNextButton` (next month control)
- `GhostCalendarGrid` (`role="grid"` month matrix with weekday headers)
- `GhostCalendarCell` (`role="gridcell"` date control)
- `useGhostCalendar` (composable returning navigation, selection, and helpers)
- Types: props, slot props, exposed refs, `GhostCalendarSelectionMode`,
  `GhostCalendarValue`, `UseGhostCalendarOptions`, `UseGhostCalendarReturn`, and
  re-exported `CalendarDate` usage notes (values are
  `@internationalized/date` `CalendarDate` instances).

Themed exports from `@ghostvue/themes`:

- All headless parts above (wrappers with `data-themed`) plus styles via
  `default.css`.

### Date values and consumer conversion

- Public `modelValue` / `defaultValue` use `CalendarDate` from
  `@internationalized/date` (single mode) or
  `{ start: CalendarDate; end: CalendarDate }` (range mode, both ends inclusive
  when complete).
- Convert to ISO calendar string: `date.toString()` → `YYYY-MM-DD`.
- Parse ISO: `parseDate(iso)`.
- Convert to `Date` at local noon to avoid DST edges:
  `new Date(date.year, date.month - 1, date.day)`.
- Convert from `Date`: `new CalendarDate(d.getFullYear(), d.getMonth() + 1,
d.getDate())`.
- The library pins `@internationalized/date` as a runtime dependency of
  `@ghostvue/vue`; consumers must not assume a different major API.

### Props and configuration

#### `GhostCalendar` (root)

| Prop                  | Type                              | Default     | Contract                                                                                                                        |
| --------------------- | --------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`          | `GhostCalendarValue \| null`      | `undefined` | Controlled selection. Omit for uncontrolled; `null` is a controlled empty selection (see below).                                |
| `defaultValue`        | `GhostCalendarValue`              | `undefined` | Initial selection when `modelValue` is omitted.                                                                                 |
| `selectionMode`       | `'single' \| 'range'`             | `'single'`  | Single date vs inclusive range.                                                                                                 |
| `minValue`            | `CalendarDate \| undefined`       | `undefined` | Dates before this are disabled.                                                                                                 |
| `maxValue`            | `CalendarDate \| undefined`       | `undefined` | Dates after this are disabled.                                                                                                  |
| `isDateDisabled`      | `(date: CalendarDate) => boolean` | `undefined` | Additional disabled dates.                                                                                                      |
| `locale`              | `string`                          | `'en-US'`   | `Intl` locale for weekday/month labels and default week start.                                                                  |
| `weekStartsOn`        | `0 \| 1 \| ... \| 6 \| undefined` | `undefined` | Override week start (Sunday = 0). When omitted, use locale preference.                                                          |
| `visibleMonth`        | `CalendarDate \| undefined`       | `undefined` | Controlled month anchor (first day of displayed month).                                                                         |
| `defaultVisibleMonth` | `CalendarDate \| undefined`       | `undefined` | Initial month when `visibleMonth` is omitted.                                                                                   |
| `today`               | `CalendarDate \| undefined`       | `undefined` | **Required for deterministic SSR/tests.** When omitted, `"today"` styling is not applied (no implicit `new Date()` during SSR). |
| `disabled`            | `boolean`                         | `false`     | Disables grid interaction.                                                                                                      |

#### `GhostCalendarHeader`, `GhostCalendarHeading`, nav buttons

| Part                      | Prop | Default    | Contract                                      |
| ------------------------- | ---- | ---------- | --------------------------------------------- |
| `GhostCalendarHeader`     | `as` | `'div'`    | `role="group"` with `aria-label` overridable. |
| `GhostCalendarHeading`    | `as` | `'h2'`     | `id` for `aria-labelledby` on grid.           |
| `GhostCalendarPrevButton` | `as` | `'button'` | Previous month; `type="button"`.              |
| `GhostCalendarNextButton` | `as` | `'button'` | Next month; `type="button"`.                  |

#### `GhostCalendarGrid`

| Prop | Type              | Default | Contract                                                                                                                                                                         |
| ---- | ----------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `as` | element/component | `'div'` | Renders weekday header row and body rows inside the grid host (`role="grid"`). Default slot optional; when omitted, renders `GhostCalendarCell` for each date in the month grid. |

Host uses `role="grid"`, `aria-labelledby` → heading id when present,
`data-part="grid"`.

#### `GhostCalendarCell`

| Prop   | Type              | Default    | Contract                           |
| ------ | ----------------- | ---------- | ---------------------------------- |
| `as`   | element/component | `'button'` | Native button when `as="button"`.  |
| `date` | `CalendarDate`    | required   | Calendar day this cell represents. |

### v-model contracts

- `GhostCalendar` owns selection via `useControllableState` on `modelValue`.
- `update:modelValue` emits on user-driven selection changes; controlled parents
  that ignore the event keep the prior value.
- `visibleMonth` is independently controllable via `useControllableState`; emits
  `update:visibleMonth` when navigation changes the displayed month.
- Range selection: first activation sets `start` with `end` equal to `start`;
  second activation on a later day sets `end`; second on earlier day resets
  `start`; third activation starts a new range.
- Single selection replaces the value on each activation.
- **Controlled empty (`null`)** — added in GHO-208 for `GhostDatePicker`.
  `modelValue: null` keeps the calendar controlled while nothing is selected;
  `undefined` still means uncontrolled. `null` passes through the
  control-ownership check unchanged, then every selection reader (slot
  `modelValue`, `useGhostCalendar().modelValue`, cell state) normalizes it to
  the existing empty output, `undefined`. `defaultValue` is ignored for the
  initial selection, visible month, and focus while `modelValue` is `null`.
  Proposals emitted while controlled-empty use the existing payload types and
  have no effect until the parent applies them. Setting `modelValue` back to
  `null` clears a pending range start, so the next activation starts a new
  range. `GhostCalendarValue`, emitted payloads, and the `defaultValue`
  contract are unchanged.

### Events, callbacks, slots, and exposed methods

- `GhostCalendar` emits `update:modelValue`, `update:visibleMonth`, and
  `select`.
- `select(date: CalendarDate)` (composable: `onSelect`) fires exactly once for
  each accepted date activation, after the `update:modelValue` proposal and
  focus update. It fires for repeated activation of the same date and when a
  controlled parent ignores the proposal. Activations rejected because the
  date is outside `minValue` / `maxValue`, unavailable via `isDateDisabled`,
  outside the visible month, or the root is `disabled` emit nothing.
  A pending range start and a completed one-day range propose the same
  `{ start, end }` shape; consumers that must tell them apart (such as
  `GhostDatePicker`, which owns its own range anchor per the
  [DatePicker specification](/specs/date-picker#additive-dependency-contracts-calendar-and-dialog))
  count `select` activations instead of reading model proposals.
- Default slot: `{ modelValue, visibleMonth, selectionMode }`.
- `GhostCalendarHeading` default slot: `{ label, visibleMonth }` (localized
  month/year string).
- `GhostCalendarGrid` optional `cell` slot: `{ date, disabled, selected,
focused, today, formattedDate, props }` for custom cell rendering.
- Parts expose `{ element, focus?, blur? }` where they render a focusable host.

## State model

- **Visible month** — `visibleMonth` normalized to the first day of that month.
- **Focused date** — internal roving focus target within the grid; initialized
  from selection or `visibleMonth` on mount.
- **Selection** — `data-state="selected" | "range-start" | "range-end" |
"range-middle" | "none"` on cells.
- **Outside month** — dates shown for layout padding use `data-outside-month`
  and are disabled for selection (still focusable unless disabled).

### Loading, empty, disabled, read-only, and error states

- Root `disabled` disables all cells and navigation buttons.
- Root `disabled` disables the entire calendar.
- `minValue` / `maxValue` are hard bounds: those dates cannot receive focus and
  keyboard moves stop at the bound.
- `isDateDisabled` marks **unavailable** dates: they remain focusable, expose
  `aria-disabled`, and cannot be selected (React Aria / APG unavailable dates).
- Outside-month padding days are not selectable (`aria-disabled`) but remain
  focusable for grid continuity unless out of min/max bounds.

## Consumer data

- `CalendarDate` objects are treated as immutable values (`@internationalized/date`).
- `isDateDisabled` must be pure; the component does not cache across months beyond
  the rendered grid.

## Accessibility contract

Follows [WAI-ARIA APG Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) grid behavior.

### Semantics and relationships

- Grid: `role="grid"`, labeled by heading when mounted.
- Weekday row: `role="row"` with `role="columnheader"` cells.
- Date row: `role="row"`; each date: `role="gridcell"` containing a focusable
  control (default `button`) with `aria-label` = full spoken date, `aria-selected`
  when selected, and `aria-disabled` when unavailable or outside-month (native
  `disabled` only for min/max/root-disabled dates).
- Visually hidden live region (`aria-live="polite"`) on the root announces month
  changes when `visibleMonth` updates from keyboard or buttons.
- Stable `data-part`, `data-ghost-calendar`, `.ghost-calendar-*` classes.

### Keyboard interaction (on grid with focus inside)

| Key                   | Behavior                                                 |
| --------------------- | -------------------------------------------------------- |
| `ArrowRight` / `Left` | Previous / next day (RTL swaps horizontal).              |
| `ArrowDown` / `Up`    | Next / previous week.                                    |
| `Home` / `End`        | Start / end of week (respect `weekStartsOn`).            |
| `PageDown` / `PageUp` | Next / previous month (moves focus).                     |
| `Shift+PageDown/Up`   | Next / previous year.                                    |
| `Enter` / `Space`     | Select focused date unless unavailable or out of bounds. |

Keyboard moves land on every in-bounds calendar day, including unavailable dates.
Only `minValue` / `maxValue` stop arrow, home/end, and week moves. Month changes
announce the new month label; month-sized moves clamp (e.g. Jan 31 + 1 month →
last day of February).

### Focus behavior

- Roving `tabindex`: focused date `0`, other in-bounds cells `-1`.
- Tab into grid focuses the selected date when present, else `today` when
  provided, else the first day of `visibleMonth`.
- Prev/next buttons are in normal tab order before/after the grid per composition.

### Assistive technology expectations

- Heading reflects visible month; live region repeats month on page navigation.
- Selected range announced via `aria-selected` on endpoints and selected singles.

## Rendering and customization

- `ghost-calendar`, `ghost-calendar-header`, `ghost-calendar-heading`,
  `ghost-calendar-prev`, `ghost-calendar-next`, `ghost-calendar-grid`,
  `ghost-calendar-cell` classes.
- `data-state`, `data-outside-month`, `data-today` on cells.
- Themed CSS uses existing `--ghost-*` tokens only.

## Environment behavior

### SSR and hydration

- Pass explicit `today` for stable today highlighting in SSR and tests.
- No `document`/`window` during setup; grid keyboard listeners attach in
  `onMounted`.
- `Intl` and `@internationalized/date` are pure; locale and pinned dates are
  deterministic.

### Mobile and touch

- Pointer activation on cells selects dates; buttons activate month navigation.

## Performance

- One month matrix (~42 cells) per grid; no virtualization.
- Global listeners only on the grid element while mounted.

## Composition

- Reuses `useControllableState`, `useGhostId`, patterns from `GhostTabs` /
  `GhostSelect` for context injection and attr merging.
- `@internationalized/date` for calendar arithmetic; `Intl.DateTimeFormat` for
  labels.

## Test plan

- Unit: selection single/range, min/max bounds vs `isDateDisabled` unavailable
  focus, controlled ignore, `select` ordering/repeat/disabled suppression,
  controlled-empty `null` (ignored proposals, clearing a pending range),
  month navigation, keyboard moves, roving tabindex,
  disabled root, locale week
  start, SSR no document listeners.
- Integration: `expectSsrHydration` compound tree.
- Themed ref smoke test (scaffold).
- E2e: basic example keyboard + pointer + Axe. Real-focus grid navigation and
  RTL arrow mirroring are tagged `@cross-browser` and also run in Firefox and
  WebKit.
- Visual baselines via `pnpm test:visual:docker` for registered examples.
- Type tests for consumer inference.

## Documentation plan

- `docs/components/calendar.md` API and a11y section.
- Examples: `calendar/basic`, `calendar/range`, `calendar/controlled`,
  `calendar/locale`, `calendar/themed`.

## Compatibility and release impact

- New `@ghostvue/vue` and `@ghostvue/themes` surface; Changeset **minor** for
  new `GhostCalendar` family and new runtime dependency
  `@internationalized/date@3.12.4`.

## Open architectural questions

None; dependency choice recorded in GHO-102 (Zac, Nov 13, 2026).
