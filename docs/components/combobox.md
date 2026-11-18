# GhostCombobox

`GhostCombobox` is an editable list-autocomplete combobox for filters, async
lookups, and form fields. Import headless parts from `@ghostvue/vue` or themed
wrappers from `@ghostvue/themes`. Filtering and fetching are consumer-owned: the
component renders whatever options you mount and emits the current query.

## Basic use

<GhostExample id="combobox/basic" />

The input is `role="combobox"`; suggestions live in a portaled listbox.

## Async search

<GhostExample id="combobox/async" />

Listen for `search` (with `requestId`), call `begin(payload.requestId)` at fetch
start, and use `isLatest(payload.requestId)` before applying results so
stale responses do not overwrite newer results.

Filtering or replacing results never clears the selection. A selected value whose
option is no longer rendered stays selected, keeps submitting with the form, and
keeps its last known label; no `update:modelValue` is emitted.

## Multiple selection

<GhostExample id="combobox/multi" />

Set `multiple` to toggle string values without closing the listbox.

## Field integration

<GhostExample id="combobox/field" />

Spread `GhostFieldControl` slot props onto `GhostComboboxInput`.

## Forms and reset

<GhostExample id="combobox/form" />

`defaultValue` is the form-reset seed. Set `name` on the root so a visually hidden
input submits the selection and participates in native `required` validation.

## Themed use

<GhostExample id="combobox/themed" />

## API

### `GhostCombobox`

| Prop            | Type                              | Default     | Description                                    |
| --------------- | --------------------------------- | ----------- | ---------------------------------------------- |
| `modelValue`    | `string \| string[] \| undefined` | `undefined` | Controlled selection.                          |
| `defaultValue`  | same                              | `undefined` | Uncontrolled seed and reset value.             |
| `multiple`      | `boolean`                         | `false`     | Multi-select toggles membership in `string[]`. |
| `search`        | `string \| undefined`             | `undefined` | Controlled query in the input.                 |
| `defaultSearch` | `string`                          | `''`        | Initial query when `search` is omitted.        |
| `name`          | `string`                          | `undefined` | Submit input name.                             |
| `disabled`      | `boolean`                         | `false`     | Disables input, trigger, and options.          |
| `required`      | `boolean`                         | `false`     | Required when `name` is set.                   |
| `invalid`       | `boolean`                         | `false`     | `aria-invalid` on the input.                   |
| `loading`       | `boolean`                         | `false`     | Hides empty slot; sets listbox `aria-busy`.    |
| `open`          | `boolean \| undefined`            | `undefined` | Controlled listbox open state.                 |
| `defaultOpen`   | `boolean`                         | `false`     | Initial open state.                            |
| `placeholder`   | `string`                          | `undefined` | Input placeholder.                             |

### Events

- `update:modelValue`, `update:search`, `update:open`
- `search` — `{ query: string, requestId: number }` on each query change

### Keyboard and IME

While an input method editor is composing (Japanese, Chinese, Korean, and
similar input), arrow keys, `Enter`, and `Escape` belong to the IME's candidate
list: the combobox does not move the highlight, select, or close until the
composition is committed. Your own `@keydown` handlers on `GhostComboboxInput`
still receive those events.

### Focus and dismissal

The list closes when focus leaves the whole widget: the input, the optional
`GhostComboboxTrigger`, and the content, whether it is portaled or rendered
inline with `:portal="false"`. This covers `Tab`, `Shift+Tab`, and focus moved
by your code (`element.focus()` elsewhere or `blur()`). Focus stays where it
went; it is not pulled back to the input. Moving between the input and the
trigger, selecting an option with the pointer, or pressing a non-focusable part
of the list (a group label, padding) does not close it.

Leaving also clears the unfinished query. In single mode the input shows the
committed option's label again (or becomes empty when nothing is selected); in
multiple mode the query becomes empty. The selection never changes. When the
query changes, `update:search` and `search` are emitted so filtered or async
results match the query on the next open.

With a controlled `open` or `search`, the combobox only requests the change
(`update:open` with `false`, `update:search`). If the parent keeps its value,
the list stays as the parent renders it.

### Parts

- `GhostComboboxInput`, `GhostComboboxTrigger`, `GhostComboboxContent`
- `GhostComboboxOption`, `GhostComboboxGroup`, `GhostComboboxLabel`, `GhostComboboxEmpty`
- `useGhostCombobox`, `useGhostComboboxAsyncSearch`

### Localization (`messages`)

Pass a reactive `messages` (`GhostComboboxMessages`) object to `GhostCombobox` or
`useGhostCombobox` to override internal announcements and native validation
strings without a global locale provider:

- `loading`: live-region announcement while `loading` is `true` (default `'Loading results'`)
- `empty`: live-region announcement when open with zero enabled options (default `'No results available'`)
- `results`: `(count: number) => string` formatter when open with results (default `` `${count} results available` ``)
- `required`: native `setCustomValidity` message when `required` is `true` and empty (default `'Select a value.'`)

See the [specification](/specs/combobox) for keyboard, highlight, portal, and
SSR behavior.
