# GhostRadioGroup

`GhostRadioGroup` is a native radio group with `GhostRadioGroupItem` parts.
Keyboard and tab order use the platform same-`name` radio model (arrow keys move
focus and select). Import from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default visual treatment.

## Basic use

<GhostExample id="radio-group/basic" />

Wrap each item in a `<label>` or associate labels with `for`/`id`. A shared
`name` enables native form submission. When `name` is omitted, the group still
generates a stable shared `name` so items behave as one native group; pass an
explicit `name` for forms you intend to submit.

## Field integration

<GhostExample id="radio-group/field" />

Spread `GhostFieldControl` slot props onto the group root. Per-option labels stay
local to each item input.

## Forms and reset

<GhostExample id="radio-group/form" />

`defaultValue` is the form-reset seed. A native `reset` on the owner form
restores that mounted value.

## API

### `GhostRadioGroup`

| Prop           | Type                         | Default      | Description                                                                                 |
| -------------- | ---------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `modelValue`   | `string`                     | `undefined`  | Controlled selected value. Omit for uncontrolled use.                                       |
| `defaultValue` | `string`                     | `undefined`  | Initial value when uncontrolled; omitted means none checked. Form reset restores this seed. |
| `name`         | `string`                     | `undefined`  | Shared native `name`; generated when omitted.                                               |
| `disabled`     | `boolean`                    | `false`      | Disables the group.                                                                         |
| `required`     | `boolean`                    | `false`      | Native required on item inputs.                                                             |
| `invalid`      | `boolean`                    | `false`      | Sets `aria-invalid` on the root for Field.                                                  |
| `orientation`  | `'horizontal' \| 'vertical'` | `'vertical'` | Themed layout (`data-orientation`); not keyboard behavior.                                  |
| `as`           | `string \| Component`        | `'fieldset'` | Root host. Non-fieldset hosts use `role="radiogroup"`.                                      |

### `GhostRadioGroupItem`

| Prop       | Type      | Default | Description                                |
| ---------- | --------- | ------- | ------------------------------------------ |
| `value`    | `string`  | —       | Option value; must be unique in the group. |
| `disabled` | `boolean` | `false` | Disables this option only.                 |

## Themed use

<GhostExample id="radio-group/themed" />

The themed wrapper adds `size` on the group (layout density). Item radios pick
up the default ring and dot styles.

## Accessibility

- Default root: `fieldset` (native group). Use `legend` or associate a group
  label with `aria-labelledby` when not using Field.
- Native group: one tab stop; arrow keys move focus and select among items with a
  shared `name`. RTL follows the root or ancestor `dir`.

See the [specification](./radio-group-spec.md) for the full contract.
