# GhostField

`GhostField` connects a single control with its label, description, and
validation message. Import the compound parts from `@ghostvue/vue` for headless
use, or from `@ghostvue/themes` when you want the default vertical stack styles.

<GhostExample id="field/profile-settings" />

The profile form composes themed `GhostField` with `GhostInput` and
`GhostTextarea`: required fields mark their labels, the seeded invalid support
email links its error via `aria-describedby`, and the disabled organization ID
mutes its label while disabling the underlying control. Actions stack at full
width on narrow previews.

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

<!-- @generated docs-api:vue/ghost-field begin -->

<!-- Source: packages/vue/manifests/ghost-field.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop       | Type      | Default | Description                                         |
| ---------- | --------- | ------- | --------------------------------------------------- |
| `disabled` | `boolean` | `false` | Propagates disabled semantics to the control.       |
| `id`       | `string`  | —       | Optional control id override for label association. |
| `invalid`  | `boolean` | `false` | Propagates invalid semantics and root data-state.   |
| `required` | `boolean` | `false` | Propagates required semantics to the control.       |

| Slot      | Slot props | Description                                                                |
| --------- | ---------- | -------------------------------------------------------------------------- |
| `default` | —          | Field parts (label, description, control, error) in consumer-chosen order. |

<!-- @generated docs-api:vue/ghost-field end -->

<!-- @generated docs-api:themes/ghost-field begin -->

<!-- Source: packages/themes/manifests/ghost-field.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostField` API, which it forwards.

<!-- @generated docs-api:themes/ghost-field end -->

Root: class `ghost-field`, `data-ghost-field`, `data-part="root"`, optional
`data-state="invalid" | "disabled"`.

### `GhostFieldLabel`

<!-- @generated docs-api:vue/ghost-field-label begin -->

<!-- Source: packages/vue/manifests/ghost-field-label.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                       | Default       | Description                                     |
| -------------- | -------------------------- | ------------- | ----------------------------------------------- |
| `as`           | `GhostFieldLabelElement`   | `"label"`     | Label element.                                  |
| `associate`    | `GhostFieldLabelAssociate` | `"reference"` | `for` association or nested labeling.           |
| `required`     | `boolean`                  | `false`       | Shows the required marker with root `required`. |
| `showRequired` | `boolean`                  | `true`        | Toggles the visual required indicator.          |

| Slot      | Slot props | Description      |
| --------- | ---------- | ---------------- |
| `default` | —          | Primary content. |

<!-- @generated docs-api:vue/ghost-field-label end -->

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
