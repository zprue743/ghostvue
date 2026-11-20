---
schemaVersion: 1.0.0
component: GhostDatePicker
components:
  - GhostDatePicker
  - GhostDatePickerInput
  - GhostDatePickerTrigger
  - GhostDatePickerContent
  - GhostDatePickerCalendar
packages:
  - '@ghostvue/vue'
  - '@ghostvue/themes'
specStatus: approved
approval:
  evidence: 'Approved by Zac on 2026-11-17 (GHO-207); see the Status line in this spec.'
manifests: []
sections:
  purpose:
    applicable: true
  nonGoals:
    applicable: true
  publicApi:
    applicable: true
  stateModel:
    applicable: true
  consumerData:
    applicable: true
  accessibility:
    applicable: true
  rendering:
    applicable: true
  environment:
    applicable: true
  performance:
    applicable: true
  composition:
    applicable: true
  testPlan:
    applicable: true
  documentationPlan:
    applicable: true
  compatibility:
    applicable: true
unresolvedQuestions: []
---

# GhostDatePicker specification

**Status:** Approved by Zac on 2026-11-17 ([GHO-207](https://linear.app/ghost-vue/issue/GHO-207)).
**Parent issue:** [GHO-103](https://linear.app/ghost-vue/issue/GHO-103/component-datepicker).
**Design plan:** [GHO-103 — DatePicker design plan](https://linear.app/ghost-vue/document/gho-103-datepicker-design-plan-b9c1e8db30cb).
**Dependencies:** `GhostCalendar`, `GhostDialog`, and `GhostPopover` positioning/overlay infrastructure (already Done); no new runtime dependency.

> **Anchored-modal interpretation:** GHO-103's "built on Popover" requirement is satisfied by reusing `GhostPopover`'s floating positioning and overlay infrastructure (`useFloating`, portal, dismissable layer) on `GhostDialog`/`GhostDialogContent`, while preserving `GhostPopover`'s existing non-modal public contract.

## Purpose and user problems

`GhostDatePicker` provides a headless date-entry and selection family in `@ghostvue/vue` (with optional themed wrappers and token-based CSS in `@ghostvue/themes`) combining ordinary text entry with an anchored **modal** calendar for single-date or inclusive-range selection.

- Users can type or paste dates directly in native text inputs without opening or navigating the calendar, or open the modal calendar via the trigger button.
- Applications get deterministic `CalendarDate` values (`@internationalized/date`), strict ISO form serialization, native constraint-validation alignment, and WAI-ARIA APG Date Picker Dialog accessibility.
- One interaction policy applies across desktop and mobile: a single-date calendar activation commits immediately and requests close; a range commits atomically only after two explicit date activations.
- Invalid or incomplete draft text never replaces the committed model or form value.

## Non-goals

- Time-of-day selection, JavaScript `Date` objects, timestamps, time zones, or date-time values.
- Segmented / locale-driven date-field editors or spinbutton segments.
- Natural-language date parsing (for example, `"next Friday"`).
- Multi-month calendar displays, date presets, async parsing, or alternate calendar systems.
- Device-dependent commit rules or automatic mobile bottom sheets in v1.
- Adding a new package or a new runtime dependency.
- Altering `GhostPopover`'s non-modal public contract or nesting Popover and Dialog content.
- Intercepting the entire form's submit lifecycle or inventing a form framework.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostDatePicker` — renderless state/context root and form-value owner.
- `GhostDatePickerInput` — native text input; `part="single"` by default, or `"start"` / `"end"` in range mode.
- `GhostDatePickerTrigger` — native `type="button"` control with dialog relationships and an overridable accessible name.
- `GhostDatePickerContent` — positioned modal content (`role="dialog"`, `aria-modal="true"`), including an accessible Close control by default; default slot holds the calendar and optional help/error content.
- `GhostDatePickerCalendar` — binds existing `GhostCalendar` state and supplies a default header/navigation/grid; optional default slot allows composition with existing Calendar parts.
- `useGhostDatePicker` — composable for picker state, draft lifecycle, validation, and form integration.
- Documented value, callback, error, slot, and exposed-ref types (including `GhostDatePickerRange`, `GhostDatePickerValue`, `GhostDatePickerPart`, `GhostDatePickerTextContext`, `GhostDatePickerParse`, `GhostDatePickerFormat`, `GhostDatePickerValidateRange`, `GhostDatePickerErrorCode`, `GhostDatePickerError`).

Themed exports from `@ghostvue/themes`:

- Optional `GhostDatePicker*` wrappers (`packages/themes/src/ghost-date-picker*.ts`) and scoped token-based CSS using `--ghost-*` tokens. Consumer `class` and `style` bindings are preserved.

### Value and callback types

All public date values are Gregorian date-only `CalendarDate` instances (`@internationalized/date`) in years `0001`–`9999`:

```ts
type GhostDatePickerRange = { start: CalendarDate; end: CalendarDate }
type GhostDatePickerValue = CalendarDate | GhostDatePickerRange | null
type GhostDatePickerPart = 'single' | 'start' | 'end'

interface GhostDatePickerTextContext {
  locale: string
  part: GhostDatePickerPart
}

type GhostDatePickerParse = (
  text: string,
  context: GhostDatePickerTextContext,
) => CalendarDate | null

type GhostDatePickerFormat = (
  date: CalendarDate,
  context: GhostDatePickerTextContext,
) => string

type GhostDatePickerValidateRange = (
  range: GhostDatePickerRange,
) => string | null

type GhostDatePickerErrorCode =
  | 'parse'
  | 'incomplete'
  | 'min'
  | 'max'
  | 'unavailable'
  | 'range-order'
  | 'range-validation'
  | 'required'
  | 'external-invalid'
  | 'configuration'
  | 'uncommitted'

interface GhostDatePickerError {
  code: GhostDatePickerErrorCode
  part: GhostDatePickerPart | 'range'
  message: string
}
```

- `parse` returning `null` indicates invalid nonempty input; empty input is handled before invoking `parse`.
- Callbacks (`parse`, `format`, `validateRange`, `validationMessage`, `isDateDisabled`) must be synchronous and pure; promises are not supported.
- `validateRange` returns a consumer-facing error string or `null`.

### Props and configuration

#### `GhostDatePicker` (root)

| Prop                  | Type                                           | Default        | Contract                                                                                                          |
| --------------------- | ---------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------- |
| `selectionMode`       | `'single' \| 'range'`                          | `'single'`     | Single date vs two-input inclusive range. Fixed for an instance; remount with a new `key` to change modes.        |
| `modelValue`          | `GhostDatePickerValue \| undefined`            | `undefined`    | Controlled mode-appropriate value. `undefined` = uncontrolled; `null` = controlled empty.                         |
| `defaultValue`        | `GhostDatePickerValue`                         | `null`         | Initial uncontrolled value.                                                                                       |
| `open`                | `boolean \| undefined`                         | `undefined`    | Independently controlled open state.                                                                              |
| `defaultOpen`         | `boolean`                                      | `false`        | Initial uncontrolled open state.                                                                                  |
| `minValue`            | `CalendarDate \| undefined`                    | `undefined`    | Inclusive lower bound, matching `GhostCalendar`.                                                                  |
| `maxValue`            | `CalendarDate \| undefined`                    | `undefined`    | Inclusive upper bound, matching `GhostCalendar`.                                                                  |
| `isDateDisabled`      | `(date: CalendarDate) => boolean`              | `undefined`    | Unavailable endpoint dates, matching `GhostCalendar`.                                                             |
| `validateRange`       | `GhostDatePickerValidateRange \| undefined`    | `undefined`    | Optional whole-range business validation.                                                                         |
| `locale`              | `string`                                       | `'en-US'`      | Calendar and formatting locale.                                                                                   |
| `weekStartsOn`        | `0 \| 1 \| 2 \| 3 \| 4 \| 5 \| 6 \| undefined` | `undefined`    | Week start override (Sunday = `0`); defaults to locale preference.                                                |
| `today`               | `CalendarDate \| undefined`                    | `undefined`    | Explicit current date for deterministic SSR, initial visible month fallback, and focus fallback.                  |
| `defaultVisibleMonth` | `CalendarDate \| undefined`                    | `undefined`    | Initial empty-picker month; subsequent month navigation remains internal in v1.                                   |
| `parse`               | `GhostDatePickerParse \| undefined`            | strict ISO     | Synchronous parser; consumer callbacks must round-trip valid displayed dates.                                     |
| `format`              | `GhostDatePickerFormat \| undefined`           | strict ISO     | Synchronous formatter; display formatting never changes ISO form serialization.                                   |
| `disabled`            | `boolean`                                      | `false`        | Blocks all interaction and overrides open visibility.                                                             |
| `readonly`            | `boolean`                                      | `false`        | Leaves text focusable/selectable, prevents editing/clearing, and overrides open visibility.                       |
| `required`            | `boolean`                                      | `false`        | Native required constraint on empty committed value.                                                              |
| `invalid`             | `boolean`                                      | `false`        | Consumer-supplied validity (`external-invalid`); combines with internal errors.                                   |
| `name`                | `string \| undefined`                          | `undefined`    | Native form submission name (`name` in single mode; `name[start]` / `name[end]` in range mode).                   |
| `startName`           | `string \| undefined`                          | `undefined`    | Independent override for range start submission name.                                                             |
| `endName`             | `string \| undefined`                          | `undefined`    | Independent override for range end submission name.                                                               |
| `form`                | `string \| undefined`                          | `undefined`    | External `<form>` association for hidden submission inputs and reset integration.                                 |
| `formatHint`          | `string`                                       | `'YYYY-MM-DD'` | Linked format description text; consumers using custom callbacks should supply matching instructions.             |
| `validationMessage`   | `(error: GhostDatePickerError) => string`      | `undefined`    | Optional callback to localize built-in error messages (including `uncommitted` pending-draft validation message). |

#### `GhostDatePickerInput`

- `part`: `'single' | 'start' | 'end'` (default `'single'`).
- Renders a native `<input type="text">` (no `name` attribute on the visible input; hidden inputs own submission).
- Input-local native `name` and `form` attributes cannot override the root's serialization/association contract.
- Input `invalid`, `disabled`, and `required` bindings from `GhostFieldControl` combine with root state. Local disabling does not bypass range validation.
- Range inputs each receive a distinct ID and accessible label; never apply one `GhostFieldControl` ID to both range inputs (compose ranges with a named group and separate `GhostField` instances/IDs for the two endpoints).
- Preserves consumer `class`, `style`, ARIA descriptions, and native input/focus event handlers when merging bindings.

#### `GhostDatePickerTrigger`

- Native `<button type="button">` with `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`.
- Accessible name includes the selected date or range; consumer localization is supported through native ARIA attributes (`aria-label` / `aria-labelledby`).

#### `GhostDatePickerContent`

- Exposes the existing supported floating placement/collision options and portal target (`placement` default `'bottom-start'`, `flip` and `shift` enabled by default).
- Modal semantics (`role="dialog"`, `aria-modal="true"`) are fixed in v1 rather than exposing two interaction models.
- Accepts native ARIA labeling (`aria-label` / `aria-labelledby`) and `closeLabel` (default `'Close date picker'`).
- Includes an accessible Close control by default; default slot holds `GhostDatePickerCalendar` and optional help/error content.

#### `GhostDatePickerCalendar`

- Binds existing `GhostCalendar` state and supplies a default header, month navigation, and grid.
- Optional default slot allows composition with existing `GhostCalendar*` parts without forking calendar arithmetic or keyboard navigation.

### v-model contracts

- **Selection (`modelValue` / `update:modelValue`):**
  - `undefined` means uncontrolled (initial default `null`); `null` is a controlled empty value.
  - Emits proposals on valid commits and reconciles to actual props on the next Vue tick.
  - Equal date/range values do not emit duplicate `update:modelValue` events.
  - An ignored valid proposal restores the parent's value in the display and hidden inputs; an invalid draft remains visible.
  - A materially changed external `modelValue` replaces input drafts and cancels pending calendar range progress without echoing `update:modelValue`.
  - Never mutate consumer-owned `CalendarDate` or range objects.
  - Reject a value of the wrong shape for `selectionMode` as a `configuration` error; never infer `selectionMode` from the value.
- **Open state (`open` / `update:open`):**
  - Independently controllable; defaults to closed (`false`).
  - Effective visibility is `requestedOpen && !disabled && !readonly`.
  - An ignored close proposal leaves the modal active unless `disabled` or `readonly` takes precedence; do not restore focus while the modal remains open.
- **Native form serialization and reset:**
  - Single mode with `name="date"` submits `date=2026-11-17`.
  - Range mode with `name="stay"` submits `stay[start]` and `stay[end]`; `startName` and `endName` override each endpoint independently. Omitting a name omits that corresponding successful control.
  - Valid empty values serialize as empty strings `""`. Disabled controls are omitted from submission; readonly controls submit normally.
  - Hidden inputs serialize only the current committed value in ISO (`YYYY-MM-DD`), never draft text or a proposed controlled value.
  - Uses `useNativeFormReset`: uncontrolled reset restores the captured initial `defaultValue`; controlled reset restores current props without emitting. Reset clears drafts, draft errors, and pending range progress, and requests close. Respects canceled resets (`event.preventDefault()`) and external `form` association.

### Events, callbacks, slots, and exposed methods

- `GhostDatePicker` emits `update:modelValue` and `update:open`.
- `GhostDatePicker` default slot exposes `{ value, open, pending, errors, clear, openCalendar, close }`, where `value` is the committed value, `open` is effective open state, `pending` reflects uncommitted/range-in-progress state, `errors` is `GhostDatePickerError[]`, `clear()` commits `null` (when editable), and `openCalendar()` / `close()` support custom controls.
- `GhostDatePickerInput` template refs expose `{ element, focus(), blur() }`. Native input/focus events remain native fallthrough listeners.

### Additive dependency contracts (Calendar and Dialog)

These shared changes are required parts of the DatePicker design and must ship with regression tests and updated docs/types/manifests:

1. **Calendar (`ghost-calendar.ts`, `use-ghost-calendar.ts`, `GhostCalendar.vue`):**
   - Add an additive `select(date: CalendarDate)` event, backed by `onSelect?: (date: CalendarDate) => void` in `UseGhostCalendarOptions`.
   - Fires exactly once for each accepted activation (including repeat activation of the same date) after existing selection processing. Disabled activations emit nothing.
   - Keep `GhostCalendar`'s existing `update:modelValue` contract unchanged. `GhostDatePicker` owns an explicit range anchor, consumes `select`, controls the Calendar display value, and ignores Calendar's model proposals as a source of committed picker values (ensuring a new range starts cleanly even when the prior range is one day long).
   - Widen only `GhostCalendarProps.modelValue` and `UseGhostCalendarOptions.modelValue` to accept `null` while retaining `undefined` as uncontrolled. Internally preserve `null` through the control-ownership check, then normalize it to `undefined` in existing selection readers, slots, and composable return values. Keep `GhostCalendarValue`, existing emitted payloads, and the existing default-value contract unchanged. `GhostDatePicker` binds `null` when empty.

2. **Dialog and focus scope (`ghost-dialog.ts`, `GhostDialogContent.vue`, `use-focus-scope.ts`):**
   - Add narrowly scoped `GhostDialogContent` props:
     - `focusReady?: boolean` (default `true`)
     - `initialFocus?: () => HTMLElement | null`
     - `returnFocus?: () => HTMLElement | null`
   - `focusReady` gates the first focus-scope activation of each opening after portal placement; once activated, keep the focus trap active until close even if `focusReady` changes.
   - An omitted or invalid `initialFocus` retains the existing autofocus fallback; an omitted or invalid `returnFocus` retains the existing saved-opener behavior.
   - Extend `useFocusScope` (`UseFocusScopeOptions`) with optional reactive initial/return target resolvers; invoke them only in mounted focus lifecycles. Preserve all existing defaults.
   - `GhostDatePicker` supplies `focusReady` after floating positioning and calendar cell rendering, an initial Calendar target (via a narrowly named internal grid/context focus-target accessor on Calendar rather than timers or undocumented DOM nesting), and a return target preferring its enabled trigger then its input.

## State model

Maintain three separate concepts:

1. **Committed model:** current `CalendarDate | GhostDatePickerRange | null`.
2. **Raw input drafts:** exact string(s) currently in `GhostDatePickerInput` (`single` or `start`/`end`).
3. **Pending calendar range anchor:** `CalendarDate | null` held locally while choosing a range in the modal calendar.

| Action                                                | Result                                                                                                                                                                                        |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type or paste in input                                | Preserve exact text; no model update and no caret-moving reformatting. IME composition never commits.                                                                                         |
| `Enter` in an edited input                            | Attempt a commit; call `preventDefault()` to prevent implicit form submission for that keystroke.                                                                                             |
| Blur a single input                                   | Attempt a commit.                                                                                                                                                                             |
| Move focus between range inputs                       | Retain both drafts; defer pair-level errors and commit until `Enter` or focus leaves the input pair.                                                                                          |
| Valid text commit                                     | Publish complete value and format display text. Equal date values do not emit duplicate `update:modelValue`.                                                                                  |
| Invalid or incomplete commit                          | Keep draft text and prior committed value; show and associate an error. Never silently clamp, normalize an impossible date, or swap typed endpoints.                                          |
| Clear single input, or both range inputs              | Commit `null`; `required` validity then applies. Clearing only one range endpoint is `incomplete` and preserves the committed pair.                                                           |
| Activate calendar date in single mode                 | Commit and request close.                                                                                                                                                                     |
| First calendar activation in range mode               | Start a new local range anchor; keep popup open and committed value unchanged.                                                                                                                |
| Second calendar activation in range mode              | Sort the two clicked dates, validate, then atomically commit and request close. Clicking the same day twice commits a one-day range.                                                          |
| Invalid second calendar activation                    | Keep the anchor and popup open; announce the error so another endpoint can be chosen.                                                                                                         |
| `Escape`, Close button, or outside dismissal in modal | Discard calendar-only progress; do not commit. Preserve any typed drafts captured when opening.                                                                                               |
| `Escape` in a closed, edited text field               | Restore text from the committed value and clear draft errors; do not change the model.                                                                                                        |
| Activate Trigger                                      | Attempt normal text commit first, then open even if that fails so the calendar can correct invalid input. Cancellation preserves invalid drafts; successful calendar selection replaces them. |

### Loading, empty, disabled, read-only, and error states

- **Disabled and readonly precedence:**
  - Effective visibility is `requestedOpen && !disabled && !readonly`.
  - Entering `disabled` or `readonly` cancels calendar progress, requests `open = false`, and immediately removes the interactive modal surface even if the parent ignores `update:open`.
  - Re-enabling follows the current controlled `open` prop (a retained `true` reopens).
  - `readonly` leaves text focusable and selectable but prevents editing and clearing. `disabled` blocks all interaction.
- **Configuration and external invalidity:**
  - `minValue > maxValue` is a `configuration` error and disables date selection.
  - Invalid external values or changed constraints do not rewrite the model: display the supplied value where representable, expose an error, and block validation for editable controls.
  - `invalid` prop adds `external-invalid` and combines with internal errors.
  - Changes to `parse`, `format`, or `locale` preserve dirty text and revalidate it on the next commit; pristine text reformats immediately.
- **Range validation policy:**
  - Ranges are inclusive (`start <= end`); equal endpoints are valid.
  - Built-in bounds (`minValue`/`maxValue`) and `isDateDisabled` check both endpoints.
  - **Unavailable dates inside a range are permitted by default**, matching `GhostCalendar`. Consumers needing contiguous availability, maximum stay, or booking rules use `validateRange`. Never scan arbitrarily long ranges on every render or keystroke.
- **Native constraint validation and open-modal `invalid` events:**
  - Keep native validity synchronized on the visible input(s) while typing so invalid/incomplete drafts cannot silently submit the previous hidden value (including via `form.requestSubmit()`).
  - An uncommitted dirty draft uses the `uncommitted` error code (default message `"Confirm this date"`) for native constraint validity until `Enter`/blur; visual error announcements wait for a commit attempt.
  - As with native controls, `novalidate`, `form.submit()`, and direct `FormData` extraction bypass validation; direct `FormData` returns the committed hidden value.
  - Readonly controls follow HTML's native constraint-validation exemption (externally invalid readonly values expose errors but do not block submission). Disabled controls likewise do not validate.
  - While the modal is open, editable inputs are outside its inert boundary: intercept their native `invalid` events with `preventDefault()`, announce the error inside the dialog, and focus an internal error-summary target (`tabindex="-1"`, named, omitted when not needed). The form remains invalid and submission remains blocked without forcing focus into an inert input or requiring the parent to accept a close request. Applies to both `requestSubmit()` and `reportValidity()`.

### Async behavior

Parsing and validation are synchronous. Consumers own remote availability loading and pass updated constraints (`minValue`, `maxValue`, `isDateDisabled`, `disabled`, `invalid`); `GhostDatePicker` revalidates any pending range when constraints change and checks again before committing.

## Consumer data

- All public values are Gregorian date-only `CalendarDate` values in years `0001`–`9999`. JavaScript `Date`, timestamps, time zones, and date-time values are rejected.
- Default strict ISO parsing rejects whitespace, missing zero-padding, impossible dates (e.g. Feb 30, non-leap Feb 29), overflow, and ambiguous localized strings.
- Display formatting never alters ISO form serialization.
- A thrown `parse` callback is treated as an invalid draft (`parse` error); a thrown `format` callback falls back to ISO with a development diagnostic.
- Custom callbacks do not bypass bounds or availability validation and must round-trip valid displayed dates.
- Consumer-owned `CalendarDate` and range objects are never mutated.

## Accessibility contract

### Semantics and relationships

- **Inputs:** Native `<input type="text">` with visible labels and linked format/error descriptions (`aria-describedby`), not `role="combobox"` or `role="spinbutton"`. Range mode uses a named group (`role="group"`) plus distinct Start date and End date labels.
- **Trigger:** Native `<button type="button">` with `aria-haspopup="dialog"`, `aria-expanded`, and `aria-controls`; accessible name includes the selected date or range and is overridable via native ARIA attributes.
- **Content:** Named `role="dialog"`, `aria-modal="true"`, background inert, trapped focus, and a visible Close button (`closeLabel`, default `'Close date picker'`), following the [WAI-ARIA APG Modal Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) and [Date Picker Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/examples/datepicker-dialog/) patterns.
- **Error summary:** Inside the dialog when validation fails while open (`tabindex="-1"`, accessible name, omitted when not needed).

### Keyboard interaction

- **Trigger:** `Enter` / `Space` opens the modal (attempting text commit first).
- **Closed input:** `Enter` attempts commit and prevents implicit form submission; `Escape` in an edited field restores committed text and clears draft errors; native text editing keys are preserved.
- **Modal dialog:** `Tab` / `Shift+Tab` cycle through the dialog with a single grid `Tab` stop; `Escape` closes the top layer and restores focus.
- **Calendar grid:** `ArrowLeft` / `ArrowRight` move days (reversed in RTL); `ArrowUp` / `ArrowDown` move weeks; `Home` / `End` move to week boundaries; `PageUp` / `PageDown` move months; `Shift+PageUp` / `Shift+PageDown` move years; `Enter` / `Space` activate a selectable date. Outside the grid, preserve native text editing keys.

### Focus behavior

- **Initial focus on open:** Focus the selected date (or range start), else explicit `today`, else the first date of the initial visible month, clamped to `minValue`/`maxValue`. Unavailable dates (`isDateDisabled`) remain focusable and unselectable. If no date can receive focus (for example, all dates out of bounds or disabled), focus the Close button.
- **Initial visible month:** Committed date / range start -> `defaultVisibleMonth` -> explicit `today` -> `GhostCalendar`'s deterministic January 2024 fallback. Never read the client clock during SSR.
- **Return focus on close:** Escape, single/range completion, and Close restore focus to the opener (preferring enabled trigger, then input). If the opener has disappeared or is disabled, focus the input if available; otherwise let the ancestor focus scope restore focus. Do not restore focus if a controlled parent ignores close and keeps the dialog open.
- **Outside dismissal:** Pointer activation outside dismisses the modal without activating underlying form controls.

### Assistive technology expectations

- Preserve `GhostCalendar`'s localized month/day labels and month-change live announcements.
- Add a polite range instruction (e.g., `"Choose an end date"`) after the first range activation and polite validation feedback without duplicate month announcements.
- UI instructions and error strings are consumer-localizable (`validationMessage`, `closeLabel`, ARIA attributes); `locale` alone does not promise built-in translations of every English string.

## Rendering and customization

- Headless parts merge consumer `class`, `style`, ARIA attributes, and event handlers without overwriting them.
- `GhostDatePickerCalendar` renders a default `GhostCalendar` header/navigation/grid and accepts an optional default slot for custom `GhostCalendar*` part composition.
- `GhostDatePickerContent` renders `GhostDatePickerCalendar` and an optional error summary; its default slot supports custom help/error content alongside `openCalendar()` and `close()` from the root slot.
- `@ghostvue/themes` provides optional styled wrappers using `--ghost-*` tokens with >= 44px touch targets.

## Environment behavior

### SSR and hydration

- Deterministic SSR-safe IDs (`useGhostId`), no setup-time DOM work, and no client clock reads during SSR (document supplying `today` for ordinary current-month UX).
- Deterministic closed and initially open (`defaultOpen` / `open: true`) SSR and hydration.
- Clean listener and portal/focus-scope cleanup on unmount; supports nested dialogs and portaled content.

### Mobile and touch

- Same commit and modal interaction policy on touch (no automatic mobile sheet in v1).
- Constrain content to the viewport, allow named scroll regions when needed, avoid forcing the software keyboard open on calendar entry, and provide >= 44px themed touch targets.
- Verify zoom, forced colors, and reduced motion.

## Performance

- Synchronous parsing and validation only; no range-scanning loops over arbitrarily long ranges on every render or keystroke.
- Reuses `GhostCalendar`'s single-month (~42 cells) grid without virtualization.

## Composition

- Reuses `@internationalized/date` (`CalendarDate`), `GhostCalendar`, `GhostDialog` / `GhostDialogContent`, `useFloating`, `useFocusScope`, `useNativeFormReset`, `useGhostId`, `useControllableState`, and `GhostFieldControl`.
- Composes `GhostDialogContent` with `useFloating` rather than modifying `GhostPopover` so `GhostPopover` remains non-modal and `GhostDialog` remains the single owner of modal focus trapping, inerting, scroll lock, and dismissable-layer stacking.

## Test plan

- **Unit & state tests (`use-ghost-date-picker.test.ts`, `use-ghost-calendar.test.ts`, `use-focus-scope.test.ts`):**
  - Strict ISO parsing (including leap days), thrown/invalid callbacks, empty/partial/reversed ranges, two clicks on one day, restarting an existing one-day range, selecting an earlier second endpoint, invalid drafts preserving committed model, `validateRange` rejection, changed constraints, controlled parents accepting/ignoring proposals, external updates during editing, IME composition, canceled resets, and `disabled`/`readonly` transitions.
  - Calendar `select` event ordering, repeated-date activation, disabled suppression, controlled-empty `modelValue=null` normalization, and unchanged existing Calendar output behavior.
  - `useFocusScope` readiness/target resolver defaults and regressions.
- **Vue component & SSR tests (`GhostDatePicker.test.ts`, `GhostCalendar.test.ts`, `GhostDialog.test.ts`):**
  - Headless and themed ref/slot/binding preservation, `GhostField` integration (single and named-group range), SSR/hydration for closed and open states, no leaked document listeners, and `GhostDialogContent` unchanged-default regressions.
- **Browser, accessibility, and keyboard tests (`tests/e2e/ghost-date-picker.spec.ts`, `ghost-calendar.spec.ts`, `form-reset.spec.ts`, dialog browser spec):**
  - Press every documented key and assert real focus (`toBeFocused()`) and ARIA state; cover Tab wrap, RTL arrow reversal, nested overlays, outside dismissal without click-through, unavailable/all-disabled grids, trigger removal, range cancellation, and open/closed axe scans.
  - Real `FormData`, invalid submission, `requestSubmit()` and `reportValidity()` with dirty text and while modal is open, ignored controlled close, focusable in-dialog error summary, readonly validation exemption, `disabled`/`readonly` overriding `open=true`, required fields, reset, and custom `name`/`startName`/`endName`/`form` ownership.
  - Zoom, forced colors, reduced motion, and touch target sizing.
- **Type tests:**
  - Reject plain strings, `Date`, date-times, malformed ranges, and asynchronous callbacks; verify Calendar preserves existing output signatures while accepting `modelValue=null`.

## Documentation plan

- `docs/components/date-picker.md`: API reference, accessibility guidance, `today` SSR guidance, `GhostField` range group pattern, and a prominent `validateRange` example rejecting interior unavailable dates.
- Typed runnable examples under `examples/date-picker/`: `basic`, `range`, `controlled`, `validation` / `form-reset`, `custom-format` / `locale`, `rtl`, `nested-dialog`, and `themed`, registered via the repository's example and manifest conventions.
- Update `GhostCalendar` and `GhostDialog` docs, types, and manifests for their additive contracts; update only the DatePicker row in `docs/roadmap.md` during implementation.

## Compatibility and release impact

- Adds `GhostDatePicker*` and `useGhostDatePicker` to `@ghostvue/vue` and `@ghostvue/themes` (minor Changesets for both packages at implementation time).
- Additive, backwards-compatible extensions to `GhostCalendar` (`select` / `onSelect`, `modelValue: ... | null` input) and `GhostDialogContent` / `useFocusScope` (`focusReady`, `initialFocus`, `returnFocus`).
- No new runtime dependency.

## Open architectural questions

None. All architectural and behavioral decisions in [GHO-103 — DatePicker design plan](https://linear.app/ghost-vue/document/gho-103-datepicker-design-plan-b9c1e8db30cb) were approved by Zac on 2026-11-17 (GHO-207). Manual assistive-technology review is required before stable release.
