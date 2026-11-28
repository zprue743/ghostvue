# GhostSelect

`GhostSelect` is a single-value listbox combobox for forms, filters, and
DataTable controls. The examples on this page import the styled parts from
`@ghostvue/themes`; they need no consumer CSS beyond layout. Teams that bring
their own design system can start from
[Advanced: headless composition](#advanced-headless-composition).

<GhostExample id="select/billing-preferences" />

The billing form composes themed `GhostSelect` from `@ghostvue/themes` with
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

## Field integration

The billing form above shows the wiring. Spread `GhostFieldControl` slot props
onto `GhostSelectTrigger`, the single tab stop. The trigger takes the field
`id` and `aria-describedby`, and combines the field's `invalid` and `required`
state with the root's own `invalid` and `required` props for `aria-invalid`
and `aria-required`. Set `required` on the root as well when native form
validation should block submit.

## Forms and reset

<GhostExample id="select/alert-routing-form" />

Set `name` on the root and a visually hidden input submits the selected value
with the surrounding `<form>`, so `new FormData(form)` reads the same values
the server would receive. **Save routing** lists them under **Submitted form
data**. `defaultValue` (`default-value`) is the form-reset seed, read at reset
time: change the severity or channel, then press **Reset** and each trigger
returns to its default.

**Escalation owner** sets `required` on the root. The form uses `novalidate`
to skip the browser's bubbles but still calls `form.checkValidity()`. The
empty select fails native validation, its trigger gets `aria-invalid` without
extra wiring, and the example shows a field error and moves focus to the
trigger. Choosing an owner clears the error.

With the keyboard, `Tab` to a trigger, press `Enter`, `Space`, or `ArrowDown`
to open the list on the selected option, move with `ArrowDown` / `ArrowUp`
(or type the first letters), and press `Enter` to choose. `Escape` closes the
list and returns focus to the trigger.

Rendering options conditionally never clears the selection. If the selected
option unmounts, the value stays selected, keeps submitting with the form, and
`GhostSelectValue` keeps its last known label; no `update:modelValue` is emitted.

### One value per select

`GhostSelect` holds one string (`modelValue: string | undefined`) and submits
one entry per `name`. For several values, such as labels or recipients, use
[`GhostCombobox` with `multiple`](./combobox.md#multiple-selection), which
toggles a `string[]` and submits one entry per selected value.

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

## Advanced: headless composition {#advanced-headless-composition}

This section is for teams that bring their own design system and style the
parts themselves. Import the same parts from `@ghostvue/vue`; behavior, ARIA,
and form participation are identical, but nothing is painted.

### Headless select {#basic-use}

<GhostExample id="select/basic" />

The trigger is a `role="combobox"` control; options live in a portaled listbox.
The headless layer paints nothing, so the example styles its own trigger
chevron, list surface, check mark, and highlighted, selected and disabled
option states from `aria-selected`, `aria-disabled` and focus.

### Headless form {#headless-form}

<GhostExample id="select/form" />

The same `name` and `default-value` contract without a theme. The list renders
inline (`:portal="false"`) and the sample brings its own consumer CSS. The
headless field wiring is the `select/field` example on the
[GhostSelect reference page](/reference/vue/ghost-select).

## API

### `GhostSelect`

<!-- @generated docs-api:vue/ghost-select begin -->

<!-- Source: packages/vue/manifests/ghost-select.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                  | Default | Description                                                                                |
| -------------- | --------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `defaultOpen`  | `boolean`             | `false` | Initial open state.                                                                        |
| `defaultValue` | `string`              | —       | Uncontrolled seed and reset value.                                                         |
| `disabled`     | `boolean`             | `false` | Disables the control.                                                                      |
| `form`         | `string`              | —       | Declared prop `form`.                                                                      |
| `invalid`      | `boolean`             | `false` | `aria-invalid` on the trigger.                                                             |
| `messages`     | `GhostSelectMessages` | —       | Overridable internal strings (`required` validation message, default `'Select a value.'`). |
| `modelValue`   | `string`              | —       | Controlled value.                                                                          |
| `name`         | `string`              | —       | Submit input name.                                                                         |
| `open`         | `boolean`             | —       | Controlled listbox open state.                                                             |
| `placeholder`  | `string`              | —       | Shown when no value is selected.                                                           |
| `required`     | `boolean`             | `false` | Required when `name` is set.                                                               |

| Slot      | Slot props | Description      |
| --------- | ---------- | ---------------- |
| `default` | —          | Primary content. |

<!-- @generated docs-api:vue/ghost-select end -->

<!-- @generated docs-api:themes/ghost-select begin -->

<!-- Source: packages/themes/manifests/ghost-select.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostSelect` API, which it forwards.

<!-- @generated docs-api:themes/ghost-select end -->

### Parts

- `GhostSelectTrigger`, `GhostSelectValue`, `GhostSelectContent`
- `GhostSelectOption`, `GhostSelectGroup`, `GhostSelectLabel`
- `useGhostSelect` for advanced composition

See the [specification](/specs/select) for keyboard, typeahead, portal, and
SSR behavior. Keys owned by an active IME composition do not run typeahead or
listbox commands.
