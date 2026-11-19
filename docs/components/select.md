# GhostSelect

`GhostSelect` is a single-value listbox combobox for forms, filters, and
DataTable controls. Import headless parts from `@ghostvue/vue` or themed wrappers
from `@ghostvue/themes`.

<GhostExample id="select/billing-preferences" />

The billing form composes themed `GhostSelect` with
[`GhostField`](./field.md) for labels, hints, and errors. The plan list shows a
price line under each name, but `textValue` keeps the trigger to the short name
and drives typeahead; Enterprise is a `disabled` option that keyboard focus and
clicks skip. Invoice currency starts empty, so the trigger shows its muted
placeholder. Saving without a currency marks the field invalid and moves focus
to its trigger; choosing one clears the error. A long delivery choice ends with
an ellipsis in the trigger and wraps inside the list. The tax region select is
`disabled`. Each list opens in a body portal that picks up the light or dark
theme. The form keeps a 32rem maximum width and the cycle and currency row
stacks when it gets narrow.

## Basic use

<GhostExample id="select/basic" />

The trigger is a `role="combobox"` control; options live in a portaled listbox.

## Field integration

<GhostExample id="select/field" />

Spread `GhostFieldControl` slot props onto `GhostSelectTrigger`, the single tab
stop. The trigger takes the field `id` and `aria-describedby`, and combines the
field's `invalid` and `required` state with the root's own `invalid` and
`required` props for `aria-invalid` and `aria-required`. Set `required` on the
root as well when native form validation should block submit.

## Forms and reset

<GhostExample id="select/form" />

`defaultValue` is the form-reset seed (read at reset time). Set `name` on the
root so a visually hidden input submits the selected value and participates in
native `required` validation.

Rendering options conditionally never clears the selection. If the selected
option unmounts, the value stays selected, keeps submitting with the form, and
`GhostSelectValue` keeps its last known label; no `update:modelValue` is emitted.

## Themed use

<GhostExample id="select/themed" />

The themed trigger fills its container, so the layout around it sets the width.
The value takes the free space and ends a long label with an ellipsis; extra
children such as an icon keep their size. Like a native `<select>`, a long label
still counts toward the trigger's minimum width, so give a grid track or flex
item that holds it a zero minimum (`minmax(0, 1fr)` or `min-inline-size: 0`)
when the label should truncate. A placeholder is muted. Keyboard focus
and the open state share the focus ring, an `aria-invalid` trigger gets the
danger border, and a disabled trigger uses the disabled action tokens. Hover
changes only colors, so the control never shifts. In the list, long option
labels wrap, hovered options get a muted fill, and the selected option is
muted and medium weight.

## API

### `GhostSelect`

| Prop           | Type                  | Default     | Description                                                                                |
| -------------- | --------------------- | ----------- | ------------------------------------------------------------------------------------------ |
| `modelValue`   | `string \| undefined` | `undefined` | Controlled value.                                                                          |
| `defaultValue` | `string \| undefined` | `undefined` | Uncontrolled seed and reset value.                                                         |
| `name`         | `string`              | `undefined` | Submit input name.                                                                         |
| `disabled`     | `boolean`             | `false`     | Disables the control.                                                                      |
| `required`     | `boolean`             | `false`     | Required when `name` is set.                                                               |
| `invalid`      | `boolean`             | `false`     | `aria-invalid` on the trigger.                                                             |
| `open`         | `boolean`             | `undefined` | Controlled listbox open state.                                                             |
| `defaultOpen`  | `boolean`             | `false`     | Initial open state.                                                                        |
| `placeholder`  | `string`              | `undefined` | Shown when no value is selected.                                                           |
| `messages`     | `GhostSelectMessages` | `undefined` | Overridable internal strings (`required` validation message, default `'Select a value.'`). |

### Parts

- `GhostSelectTrigger`, `GhostSelectValue`, `GhostSelectContent`
- `GhostSelectOption`, `GhostSelectGroup`, `GhostSelectLabel`
- `useGhostSelect` for advanced composition

See the [specification](/specs/select) for keyboard, typeahead, portal, and
SSR behavior. Keys owned by an active IME composition do not run typeahead or
listbox commands.
