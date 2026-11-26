# GhostRadioGroup

`GhostRadioGroup` is a native radio group with `GhostRadioGroupItem` parts.
Keyboard and tab order use the platform same-`name` radio model (arrow keys move
focus and select). Import from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default visual treatment.

<GhostExample id="radio-group/deployment-tier" />

The deployment selector pairs a vertical `GhostRadioGroup` for compute tiers
(including a disabled enterprise option) with a compact `size="sm"` horizontal
group for billing cadence.

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

<!-- @generated docs-api:vue/ghost-radio-group begin -->

<!-- Source: packages/vue/manifests/ghost-radio-group.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                         | Default      | Description                                                                                 |
| -------------- | ---------------------------- | ------------ | ------------------------------------------------------------------------------------------- |
| `as`           | `GhostRadioGroupElement`     | `"fieldset"` | Root host. Non-fieldset hosts use `role="radiogroup"`.                                      |
| `defaultValue` | `string`                     | —            | Initial value when uncontrolled; omitted means none checked. Form reset restores this seed. |
| `disabled`     | `boolean`                    | `false`      | Disables the group.                                                                         |
| `invalid`      | `boolean`                    | `false`      | Sets `aria-invalid` on the root for Field.                                                  |
| `modelValue`   | `string`                     | —            | Controlled selected value. Omit for uncontrolled use.                                       |
| `name`         | `string`                     | —            | Shared native `name`; generated when omitted.                                               |
| `orientation`  | `GhostRadioGroupOrientation` | `"vertical"` | Themed layout (`data-orientation`); not keyboard behavior.                                  |
| `required`     | `boolean`                    | `false`      | Native required on item inputs.                                                             |

| Slot      | Slot props | Description        |
| --------- | ---------- | ------------------ |
| `default` | —          | Container content. |

<!-- @generated docs-api:vue/ghost-radio-group end -->

<!-- @generated docs-api:themes/ghost-radio-group begin -->

<!-- Source: packages/themes/manifests/ghost-radio-group.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostRadioGroup` API, which it forwards:

| Prop   | Type                   | Default | Description                                                                              |
| ------ | ---------------------- | ------- | ---------------------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `"md"`  | Group layout density. The default omits data-size so CSS can treat a missing hook as md. |

<!-- @generated docs-api:themes/ghost-radio-group end -->

### `GhostRadioGroupItem`

<!-- @generated docs-api:vue/ghost-radio-group-item begin -->

<!-- Source: packages/vue/manifests/ghost-radio-group-item.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop       | Type      | Default  | Description                                |
| ---------- | --------- | -------- | ------------------------------------------ |
| `disabled` | `boolean` | `false`  | Disables this option only.                 |
| `value`    | `string`  | Required | Option value; must be unique in the group. |

<!-- @generated docs-api:vue/ghost-radio-group-item end -->

## Themed use

<GhostExample id="radio-group/themed" />

The themed wrapper adds `size` on the group (layout density). Item radios pick
up the default ring and dot styles.

## Accessibility

- Default root: `fieldset` (native group). Use `legend` or associate a group
  label with `aria-labelledby` when not using Field.
- Native group: one tab stop; arrow keys move focus and select among items with a
  shared `name`. RTL follows the root or ancestor `dir`.

See the [specification](/specs/radio-group) for the full contract.
