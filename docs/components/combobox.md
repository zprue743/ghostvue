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

Listen for `search` (with `requestId`) and use `useGhostComboboxAsyncSearch` so
stale responses do not overwrite newer results.

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

| Prop            | Type                               | Default     | Description                                      |
| --------------- | ---------------------------------- | ----------- | ------------------------------------------------ |
| `modelValue`    | `string \| string[] \| undefined`  | `undefined` | Controlled selection.                          |
| `defaultValue`  | same                               | `undefined` | Uncontrolled seed and reset value.               |
| `multiple`      | `boolean`                          | `false`     | Multi-select toggles membership in `string[]`.   |
| `search`        | `string \| undefined`              | `undefined` | Controlled query in the input.                 |
| `defaultSearch` | `string`                           | `''`        | Initial query when `search` is omitted.        |
| `name`          | `string`                           | `undefined` | Submit input name.                             |
| `disabled`      | `boolean`                          | `false`     | Disables input, trigger, and options.          |
| `required`      | `boolean`                          | `false`     | Required when `name` is set.                     |
| `invalid`       | `boolean`                          | `false`     | `aria-invalid` on the input.                     |
| `loading`       | `boolean`                          | `false`     | Hides empty slot; sets listbox `aria-busy`.       |
| `open`          | `boolean \| undefined`             | `undefined` | Controlled listbox open state.                   |
| `defaultOpen`   | `boolean`                          | `false`     | Initial open state.                            |
| `placeholder`   | `string`                           | `undefined` | Input placeholder.                               |

### Events

- `update:modelValue`, `update:search`, `update:open`
- `search` — `{ query: string, requestId: number }` on each query change

### Parts

- `GhostComboboxInput`, `GhostComboboxTrigger`, `GhostComboboxContent`
- `GhostComboboxOption`, `GhostComboboxGroup`, `GhostComboboxLabel`, `GhostComboboxEmpty`
- `useGhostCombobox`, `useGhostComboboxAsyncSearch`

See the [specification](./combobox-spec.md) for keyboard, highlight, portal, and
SSR behavior.