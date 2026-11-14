# GhostField

`GhostField` connects a single control with its label, description, and
validation message. Import the compound parts from `@ghostvue/vue` for headless
use, or from `@ghostvue/themes` when you want the default vertical stack styles.

## Basic labeled input

<GhostExample id="field/basic" />

`GhostFieldControl` passes an `id`, state flags, and `aria-*` relationships
through its scoped slot. Spread the slot props onto `GhostInput`, `GhostTextarea`,
or `GhostCheckbox` without changing those components.

## Invalid and required

<GhostExample id="field/invalid" />

Root `invalid` and `required` propagate to the control. `GhostFieldError` is
omitted from the tree when its slot is empty.

## Textarea

<GhostExample id="field/textarea" />

## Wrapping checkbox label

<GhostExample id="field/checkbox" />

Set `associate="wrap"` on `GhostFieldLabel` when the control lives inside the
label. The default `associate="reference"` sets `for` to the generated control id.

## Themed stack

<GhostExample id="field/themed" />

## API

### `GhostField`

| Prop       | Type      | Default | Description                                       |
| ---------- | --------- | ------- | ------------------------------------------------- |
| `id`       | `string`  | —       | Optional control id override.                     |
| `disabled` | `boolean` | `false` | Disables the control and sets root `data-state`.  |
| `invalid`  | `boolean` | `false` | Marks invalid and sets `aria-invalid` on control. |
| `required` | `boolean` | `false` | Sets native `required` on the control.            |

Root: class `ghost-field`, `data-ghost-field`, `data-part="root"`, optional
`data-state="invalid" | "disabled"`.

### `GhostFieldLabel`

| Prop           | Type                    | Default     | Description                                     |
| -------------- | ----------------------- | ----------- | ----------------------------------------------- |
| `as`           | `string \| Component`   | `'label'`   | Label element.                                  |
| `associate`    | `'reference' \| 'wrap'` | `reference` | `for` association or nested labeling.           |
| `required`     | `boolean`               | `false`     | Shows the required marker with root `required`. |
| `showRequired` | `boolean`               | `true`      | Toggles the visual required indicator.          |

### `GhostFieldDescription`

Default element `p` with stable `id` for `aria-describedby`.

### `GhostFieldError`

Default element `span` with `role="alert"` when the slot has content.

### `GhostFieldControl`

Scoped slot props:

| Name               | Type      | Description                             |
| ------------------ | --------- | --------------------------------------- |
| `id`               | `string`  | Shared control id.                      |
| `disabled`         | `boolean` | From root.                              |
| `invalid`          | `boolean` | From root.                              |
| `required`         | `boolean` | From root.                              |
| `aria-describedby` | `string`  | Description and error ids when mounted. |
| `aria-invalid`     | `boolean` | Present when root `invalid` is true.    |

## Accessibility

- Name the control with `GhostFieldLabel` (`for` or wrap).
- Hints and errors are linked with `aria-describedby`.
- Invalid uses native `aria-invalid` / `invalid` on library controls.
- Field does not trap focus or handle keyboard input; the control does.

## Styling hooks

Parts expose `data-part="label" | "description" | "error" | "control"`.
Themed CSS stacks children with spacing tokens under `.ghost-theme` or
`.ghost-themed-scope`.

## Composable

`useGhostField` returns SSR-stable ids and state for custom layouts that still
use the field relationship contract.
