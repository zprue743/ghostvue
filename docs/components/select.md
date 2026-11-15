# GhostSelect

`GhostSelect` is a single-value listbox combobox for forms, filters, and
DataTable controls. Import headless parts from `@ghostvue/vue` or themed wrappers
from `@ghostvue/themes`.

## Basic use

<GhostExample id="select/basic" />

The trigger is a `role="combobox"` control; options live in a portaled listbox.

## Field integration

<GhostExample id="select/field" />

Spread `GhostFieldControl` slot props onto the root or trigger as needed. The
trigger is the primary tab stop.

## Forms and reset

<GhostExample id="select/form" />

`defaultValue` is the form-reset seed (read at reset time). Set `name` on the
root so a visually hidden input submits the selected value and participates in
native `required` validation.

## Themed use

<GhostExample id="select/themed" />

## API

### `GhostSelect`

| Prop           | Type                  | Default     | Description                        |
| -------------- | --------------------- | ----------- | ---------------------------------- |
| `modelValue`   | `string \| undefined` | `undefined` | Controlled value.                  |
| `defaultValue` | `string \| undefined` | `undefined` | Uncontrolled seed and reset value. |
| `name`         | `string`              | `undefined` | Submit input name.                 |
| `disabled`     | `boolean`             | `false`     | Disables the control.              |
| `required`     | `boolean`             | `false`     | Required when `name` is set.       |
| `invalid`      | `boolean`             | `false`     | `aria-invalid` on the trigger.     |
| `open`         | `boolean`             | `undefined` | Controlled listbox open state.     |
| `defaultOpen`  | `boolean`             | `false`     | Initial open state.                |
| `placeholder`  | `string`              | `undefined` | Shown when no value is selected.   |

### Parts

- `GhostSelectTrigger`, `GhostSelectValue`, `GhostSelectContent`
- `GhostSelectOption`, `GhostSelectGroup`, `GhostSelectLabel`
- `useGhostSelect` for advanced composition

See the [specification](./select-spec.md) for keyboard, typeahead, portal, and
SSR behavior.
