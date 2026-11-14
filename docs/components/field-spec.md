# GhostField specification

**Status:** Proposed for GHO-71. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostField` is a composable field primitive that connects a single control with
its visible label, optional description, and validation message. It exists so
DataTable filters, settings forms, and auth flows get consistent accessible
relationships (`for`/`id`, `aria-describedby`, `aria-invalid`, `required`) without
every screen hand-wiring ids.

Sighted users see label, hint, and error copy in a predictable order. Assistive
technology gets a named control with descriptions and invalid state. The control
itself stays a native or library widget (`GhostInput`, `GhostTextarea`,
`GhostCheckbox`, or plain `<input>`).

## Non-goals

- Multi-control fieldsets, radio groups, or checkbox groups. Those belong to
  `GhostRadioGroup` and future group primitives; Field wraps one control.
- Validation logic, parsing, or error message generation. The consumer owns
  values and when `invalid` is true.
- Layout presets as the public API. Themed CSS may ship a default vertical stack;
  consumers reorder parts with their own markup.
- Replacing native `<label>` for every control. Field is the library wrapper when
  composing GhostVue inputs; headless controls still work standalone.
- Changing `GhostInput`, `GhostTextarea`, or `GhostCheckbox` public APIs.

## Public API

### Parts and exports

Headless exports from `@ghostvue/vue`:

- `GhostField` (root provider and optional grouping wrapper)
- `GhostFieldLabel` (accessible name for the control)
- `GhostFieldDescription` (hint text linked with `aria-describedby`)
- `GhostFieldError` (validation copy linked when invalid)
- `GhostFieldControl` (scoped-slot bridge onto the single control)
- `useGhostField` (ids and relationship helpers for advanced composition)
- Types: `GhostFieldProps`, `GhostFieldLabelProps`, `GhostFieldDescriptionProps`,
  `GhostFieldErrorProps`, `GhostFieldControlProps`, `GhostFieldControlSlotProps`,
  part `Exposed` interfaces, `UseGhostFieldOptions`, `UseGhostFieldReturn`,
  `GhostFieldContext`, element/`as` unions per part

Themed exports from `@ghostvue/themes`:

- `GhostField`, `GhostFieldLabel`, `GhostFieldDescription`, `GhostFieldError`,
  `GhostFieldControl` (re-exported parts plus default vertical stack styles)

### Props and configuration

#### `GhostField` (root)

| Prop       | Type      | Default | Contract                                                                                         |
| ---------- | --------- | ------- | ------------------------------------------------------------------------------------------------ |
| `id`       | `string`  | —       | Optional control id override. Otherwise `useGhostId('ghost-field-control')` supplies the id.     |
| `disabled` | `boolean` | `false` | Propagates `disabled` to the control via `GhostFieldControl` slot props. Sets root `data-state`. |
| `invalid`  | `boolean` | `false` | Propagates `invalid` / `aria-invalid` to the control. Sets root `data-state` when true.          |
| `required` | `boolean` | `false` | Propagates native `required` / `aria-required` to the control.                                   |

Native attributes fall through to the root grouping element except `id`, which
is reserved for the control id contract.

#### `GhostFieldLabel`

| Prop           | Type                                             | Default     | Contract                                                                                              |
| -------------- | ------------------------------------------------ | ----------- | ----------------------------------------------------------------------------------------------------- |
| `as`           | `GhostFieldLabelElement` (`Component \| string`) | `'label'`   | Root element. Use native `label` for the default associated pattern.                                  |
| `associate`    | `'reference' \| 'wrap'`                          | `reference` | `reference` sets `for` to the control id. `wrap` omits `for` when the control is nested in the label. |
| `required`     | `boolean`                                        | `false`     | Visual required indicator only (e.g. asterisk). Does not set `required` on the control; root does.    |
| `showRequired` | `boolean`                                        | `true`      | Renders the required marker when `required` or root `required` is true.                               |

#### `GhostFieldDescription`

| Prop | Type                                                   | Default | Contract                         |
| ---- | ------------------------------------------------------ | ------- | -------------------------------- |
| `as` | `GhostFieldDescriptionElement` (`Component \| string`) | `'p'`   | Hint element with a stable `id`. |

#### `GhostFieldError`

| Prop | Type                                             | Default  | Contract                                                   |
| ---- | ------------------------------------------------ | -------- | ---------------------------------------------------------- |
| `as` | `GhostFieldErrorElement` (`Component \| string`) | `'span'` | Error element with `id` and `role="alert"` when non-empty. |

Renders nothing in the accessibility tree when the default slot is empty.

#### `GhostFieldControl`

No props beyond native fallthrough on the bridge. The default slot receives
`GhostFieldControlSlotProps`:

| Slot prop          | Type      | Description                                                                                            |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------ |
| `id`               | `string`  | Control id shared with `GhostFieldLabel`.                                                              |
| `disabled`         | `boolean` | From root.                                                                                             |
| `invalid`          | `boolean` | From root.                                                                                             |
| `required`         | `boolean` | From root.                                                                                             |
| `aria-describedby` | `string`  | Space-separated ids of mounted description and error parts, merged with any id already on the control. |
| `aria-invalid`     | `boolean` | `true` when root `invalid` is true.                                                                    |

Library controls accept these as existing props (`disabled`, `invalid`,
`required`) and native attributes without API changes.

### v-model contracts

None on Field parts. Value state stays on the control.

### Events, callbacks, slots, and exposed methods

Root default slot has no scoped props. Each part exposes `element`, `focus`, and
`blur` like other compound primitives where the part renders a focusable host.

## State model

Root `data-state` on `.ghost-field[data-part="root"]`:

- `invalid` when `invalid` is true (wins over `disabled`)
- `disabled` when `disabled` is true and not `invalid`
- omitted when neither applies

Precedence matches `GhostInput` / `GhostTextarea` for consistency.

## Consumer data

Field does not read or mutate control values.

## Accessibility contract

### Semantics and relationships

- **Name:** `GhostFieldLabel` with `associate="reference"` sets `for` to the
  control id. Wrapping (`associate="wrap"`) uses native implicit labeling.
- **Description:** `GhostFieldDescription` id is included in control
  `aria-describedby` when mounted.
- **Error:** `GhostFieldError` id is included in `aria-describedby` when mounted
  and the slot has content. Root `invalid` sets `aria-invalid="true"` on the
  control (or `invalid` prop on `GhostInput` / `GhostTextarea`).
- **Required:** Root `required` passes through to the control. Optional visible
  marker on the label is presentational; native `required` carries semantics.
- **Disabled:** Root `disabled` passes through; native disabled semantics on
  supported controls.

No `role="group"` on the root unless the consumer adds it; a single labeled
control does not need a group role.

### Keyboard interaction

Field adds no keys. Focus and editing stay on the control.

### Focus behavior

No focus trap or restoration. Tab order is unchanged.

### Assistive technology expectations

AT reads the control name from the label, hints and errors from
`aria-describedby`, and invalid/required/disabled from native attributes or
`aria-invalid`.

## Rendering and customization

Compound parts only. Consumers choose order (label above control by default in
docs). `GhostFieldControl` uses a **scoped default slot** so consumers spread
bindings onto `GhostInput` / `GhostCheckbox` without an `asChild` helper.

Stable hooks (ADR 0004):

- Root: class `ghost-field`, `data-ghost-field`, `data-part="root"`, `data-state`
- Parts: `data-part="label" | "description" | "error" | "control"`
- Themed stack uses existing spacing/type tokens only

## Environment behavior

### SSR and hydration

Ids from `useGhostId` are SSR-stable. Relationship attributes are deterministic
from mounted parts. No browser-only state in setup.

### Mobile and touch

Native control behavior unchanged.

## Performance

Constant-time id and describedby computation. No global listeners.

## Composition

- `useGhostId` for control, label, description, and error ids
- No `useControllableState` (no field-level model)
- Integrates with `GhostInput`, `GhostTextarea`, and `GhostCheckbox` via slot
  props only

## Test plan

- Vue tests: id wiring, `for`, `aria-describedby` with description and/or error,
  `invalid`/`disabled`/`required` propagation, `associate="wrap"`, empty error
  omitted from describedby, custom control `id`, SSR markup, `data-part` / `data-state`
- Browser: labeled input typing, checkbox label activation, axe on examples
- Type tests: slot props on `GhostFieldControl`
- Visual: themed field example baselines

## Documentation plan

`docs/components/field.md` with input, textarea, checkbox, invalid/disabled
examples; playground section with unique copy; executable examples under
`examples/field/`.

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking.

- **GHO-38 styling hooks:** Uses existing `data-part` / `data-state` only.
