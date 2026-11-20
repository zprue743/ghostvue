# GhostDatePicker

`GhostDatePicker` combines ordinary text entry with an anchored **modal**
calendar for a single date or an inclusive date range. It follows the
WAI-ARIA APG [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/)
pattern. Import the parts from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default surfaces.

Values are date-only [`CalendarDate`](https://react-spectrum.adobe.com/internationalized/date/CalendarDate.html)
objects (years 0001–9999), the same type `GhostCalendar` uses. JavaScript
`Date`, timestamps, time zones, and date-time values are not accepted.

| Part                      | Renders                                  | Purpose                                                   |
| ------------------------- | ---------------------------------------- | --------------------------------------------------------- |
| `GhostDatePicker`         | hidden form inputs only                  | State, validation, and form-value owner                   |
| `GhostDatePickerInput`    | `<input type="text">`                    | Typed entry for `part="single"`, `"start"`, or `"end"`    |
| `GhostDatePickerTrigger`  | `<button type="button">`                 | Opens the calendar dialog                                 |
| `GhostDatePickerContent`  | `role="dialog"` with `aria-modal="true"` | Positioned modal surface with a Close control             |
| `GhostDatePickerCalendar` | `GhostCalendar` header, navigation, grid | Calendar bound to the picker; default content of the slot |

## Basic use

<GhostExample id="date-picker/basic" />

Typing never changes the value until the text is committed with `Enter`
or by leaving the input. Text that is invalid or incomplete stays visible
with an error and never replaces the committed value. `Escape` in an edited
input restores the committed text.

By default the input accepts strict ISO `YYYY-MM-DD`: no whitespace, zero
padding required, and impossible dates such as `2023-02-29` are rejected
rather than adjusted.

### `today` and SSR

The picker never reads the client clock. Pass `today` for "today" styling
and as the focus fallback when the picker opens empty; otherwise an empty
picker opens on `defaultVisibleMonth`, then January 2024. Computing `today`
on the server and passing it down keeps SSR and hydration identical:

```ts
import { CalendarDate } from '@ghostvue/vue'

const now = new Date()
const today = new CalendarDate(
  now.getFullYear(),
  now.getMonth() + 1,
  now.getDate(),
)
```

## Range selection

<GhostExample id="date-picker/range" />

Set `selection-mode="range"` and render one `part="start"` and one
`part="end"` input. Moving focus between the two inputs keeps both drafts;
the pair is validated when focus leaves both or on `Enter`. Typed endpoints
are never swapped: an end before the start is a `range-order` error.

In the calendar, the first activation starts a pending range (the status
line says "Choose an end date") and the second activation commits both
endpoints at once, sorted, and closes the dialog. Activating the same day
twice commits a one-day range. `Escape`, Close, or an outside click discard
the pending range.

### Range inputs with `GhostField`

Give each endpoint its own `GhostField` (and so its own id and label), and
name the pair with a group. Never bind one `GhostFieldControl` id to both
inputs.

```vue
<div role="group" aria-labelledby="trip-label">
  <span id="trip-label">Trip dates</span>
  <GhostDatePicker v-model="trip" selection-mode="range" name="trip">
    <GhostField>
      <GhostFieldLabel>Departure</GhostFieldLabel>
      <GhostFieldControl v-slot="field">
        <GhostDatePickerInput v-bind="field" part="start" />
      </GhostFieldControl>
    </GhostField>
    <GhostField>
      <GhostFieldLabel>Return</GhostFieldLabel>
      <GhostFieldControl v-slot="field">
        <GhostDatePickerInput v-bind="field" part="end" />
      </GhostFieldControl>
    </GhostField>
    <GhostDatePickerTrigger />
    <GhostDatePickerContent />
  </GhostDatePicker>
</div>
```

`disabled`, `invalid`, and `required` from `GhostFieldControl` combine with
the root's own state.

## Controlled value and open state

<GhostExample id="date-picker/controlled" />

`v-model` is `CalendarDate | { start, end } | null`. Omit it (or pass
`undefined`) for uncontrolled use from `default-value`; `null` is a
controlled empty value. The picker emits proposals and shows whatever the
parent keeps: an ignored proposal restores the parent's value in the input
and the hidden form inputs. Equal values are not re-emitted. A changed
external value replaces any typed drafts and cancels a pending range.

`v-model:open` is independent. The effective state is
`open && !disabled && !readonly`: becoming disabled or readonly requests
close and removes the dialog at once, and re-enabling follows the `open`
prop again. If a parent ignores a close request, the dialog stays open.

The root slot exposes `{ value, open, pending, errors, clear, openCalendar,
close }` for custom controls such as a Clear button.

## Validation, forms, and reset

<GhostExample id="date-picker/validation" />

`min-value` and `max-value` are inclusive, and `is-date-disabled` marks
unavailable endpoints (they stay focusable in the grid but cannot be
selected). Both endpoints of a range are checked. **Dates inside a range
are allowed even when unavailable**, matching `GhostCalendar`. Reject them,
or enforce a maximum stay, with `validate-range`. Cap the length before
scanning so the check stays bounded:

```ts
function validateStay(range: GhostDatePickerRange): string | null {
  const nights = range.end.compare(range.start)
  if (nights > 14) return 'Stays are limited to 14 nights'
  for (let offset = 0; offset <= nights; offset += 1) {
    if (isBooked(range.start.add({ days: offset }))) {
      return 'This stay includes booked nights'
    }
  }
  return null
}
```

A rejected second calendar activation keeps the first endpoint and the
dialog open, and announces the message.

Form behavior:

- `name="due"` submits `due=2026-11-17`. In range mode `name="stay"`
  submits `stay[start]` and `stay[end]`; `start-name` / `end-name` override
  each endpoint. Empty values submit `""`.
- Hidden inputs carry only the committed ISO value, never typed text, so
  display formatting never changes what is submitted. Use the root `form`
  prop for an external `<form>`; `name` and `form` on an input are ignored.
- Native constraint validation stays in sync while typing: an uncommitted
  draft ("Confirm this date"), an invalid draft, `required`, or `invalid`
  blocks submission, including `form.requestSubmit()`. Disabled pickers are
  omitted and not validated; readonly pickers submit and are exempt, as with
  native inputs.
- If the form is submitted while the calendar is open, the error summary
  inside the dialog receives focus instead of the inert input.
- A native form reset restores `default-value` (uncontrolled) or the current
  props (controlled, no event), clears drafts and errors, and closes the
  calendar. A cancelled reset is respected.

Error codes are `parse`, `incomplete`, `min`, `max`, `unavailable`,
`range-order`, `range-validation`, `required`, `external-invalid`,
`configuration`, and `uncommitted`. Localize their messages with
`validation-message`. `min-value` after `max-value`, or a value of the wrong
shape for `selection-mode`, is a `configuration` error; the picker never
infers the mode from the value.

## Custom formats and locale

<GhostExample id="date-picker/custom-format" />

`parse` and `format` are synchronous, pure callbacks receiving
`{ locale, part }`. `parse` returns `null` for invalid text (empty text is
handled before it is called). They must round-trip each other. A throwing
`parse` is an invalid draft; a throwing `format` falls back to ISO and logs
[`GHOST004`](/warnings#ghost004) in development. Custom callbacks never
bypass bounds or availability checks. Update `format-hint` so the linked
format description matches.

`locale` localizes calendar month and day labels. Built-in instructions and
messages are English; localize them with `validation-message`,
`close-label`, `end-date-instruction`, and native `aria-label` on the
trigger and content.

## Right-to-left

<GhostExample id="date-picker/rtl" />

Arrow keys follow reading direction inside an RTL container.

## Inside a dialog

<GhostExample id="date-picker/nested-dialog" />

The calendar is its own modal layer: `Escape` closes only the top layer and
returns focus to the trigger inside the outer dialog. `Escape` in an edited
input reverts the text without closing the outer dialog.

## Themed use

<GhostExample id="date-picker/themed" />

The themed parts style inputs, the trigger, and the portaled surface with
`--ghost-*` tokens and 44px touch targets. The calendar inside the surface
uses the calendar recipe.

## Content placement

`GhostDatePickerContent` anchors to the single or start input (or the
trigger when there is no input) with `placement="bottom-start"`, `flip` and
`shift` enabled, and accepts `offset`, `strategy`, `portal`, and
`portal-to`. Modal semantics are fixed: the background is inert, focus is
trapped, and the page does not scroll while it is open. `GhostPopover`
itself stays non-modal.

Without a slot, the content renders `GhostDatePickerCalendar`. Provide the
slot to add help text, or pass `GhostCalendar*` parts to
`GhostDatePickerCalendar` for a custom header.

## Accessibility

- Inputs are native text fields (not combobox or spinbutton) linked to the
  format hint and current errors with `aria-describedby`.
- The trigger is a native button with `aria-haspopup="dialog"`,
  `aria-expanded`, and `aria-controls`. Its default name includes the
  selected date or range; override it with `aria-label` or
  `aria-labelledby`.
- On open, focus moves to the selected date (or range start), else `today`
  when it is in the visible month, else the first day of that month, clamped
  to the bounds. If no date can take focus, the Close button does.
- Keyboard in the grid: arrows move by day and week (reversed in RTL),
  `Home` / `End` move to the week boundaries, `Page Up` / `Page Down` move by
  month, `Shift` + `Page Up` / `Page Down` by year, and `Enter` / `Space`
  select. `Tab` cycles through the dialog with a single grid stop.
- Closing restores focus to the trigger, or to the input when the trigger is
  gone or disabled.

Automated axe checks run with the dialog open and closed. Manual
screen-reader review is still required before this component is marked
stable.

## API

See the [specification](/specs/date-picker) and the generated
[component references](/reference/). Manifests live in
`packages/vue/manifests/ghost-date-picker*.manifest.json` and
`packages/themes/manifests/ghost-date-picker.manifest.json`.
