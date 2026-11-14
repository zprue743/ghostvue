# GhostRadioGroup specification

**Status:** Proposed for GHO-30. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostRadioGroup` is a native-first single-choice control for settings, filters,
and forms. Sighted users pick one option from a short list. Assistive technology
encounters a radiogroup with named options. Keyboard users rely on native radio
group behavior: one tab stop per group, arrow keys move focus and select among
options (including RTL), and Space operates the focused radio when applicable. The
group participates in native HTML forms: shared `name`, one submitted value, and
form reset restores the mounted default.

Consumers compose labeled options with `GhostRadioGroupItem` parts and optional
`GhostField` for a group label, description, and error (Field supplies
`id`/`aria-describedby` on the group root while items keep distinct ids for
per-option labels).

## Non-goals

- Multi-select or checkbox semantics. Use `GhostCheckbox` or a future checkbox
  group.
- Card-style or button-role toggles. Use `GhostToggleGroup` (GHO-82).
- Custom roving tabindex via `useRovingFocus`. Native same-name radios already
  implement APG keyboard and tab-stop behavior; library roving conflicts with it.
- Validation logic or message generation. Field and the consumer own invalid
  state.
- Visual styling in the headless package. Themed appearance lives in
  `@ghostvue/themes`.
- `true-value` / `false-value` boolean tricks. The v-model is the selected
  option's string `value`.

## Public API

### Parts and exports

Headless `@ghostvue/vue`:

- `GhostRadioGroup` — root container, v-model, form reset
- `GhostRadioGroupItem` — native `input type="radio"` for one option
- `useGhostRadioGroup` — state and registration helpers for advanced composition
- Types for props, exposed refs, options, and context

Themed `@ghostvue/themes`:

- `GhostRadioGroup`, `GhostRadioGroupItem` — default vertical stack styles

### Props and configuration

#### `GhostRadioGroup`

| Prop           | Type                         | Default      | Contract                                                                                                                                                                                                  |
| -------------- | ---------------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `string`                     | `undefined`  | Controlled selected value. `undefined` is uncontrolled.                                                                                                                                                   |
| `defaultValue` | `string`                     | `undefined`  | Initial value when `modelValue` is omitted. Ignored after mount. Form reset restores this captured seed.                                                                                                  |
| `name`         | `string`                     | `undefined`  | Shared native `name` on item inputs for submit. When omitted, the group generates a stable `useGhostId` name so items still form a native group (pass an explicit `name` for forms you intend to submit). |
| `disabled`     | `boolean`                    | `false`      | Disables the group (fieldset `disabled` or propagated to items).                                                                                                                                          |
| `required`     | `boolean`                    | `false`      | Native `required` on items when the group is required.                                                                                                                                                    |
| `invalid`      | `boolean`                    | `false`      | Sets `aria-invalid` on the group root for Field integration.                                                                                                                                              |
| `orientation`  | `'horizontal' \| 'vertical'` | `'vertical'` | Themed layout only (`data-orientation` on the root). Does not change keyboard behavior.                                                                                                                   |
| `as`           | `string \| Component`        | `'fieldset'` | Root element. Native `fieldset` does not need `role="radiogroup"`. Non-fieldset hosts set `role="radiogroup"`.                                                                                            |

Native attributes on the root fall through except reserved wiring (`id` may be
overridden by Field slot props intentionally). `GhostFieldControl` slot props
(`id`, `disabled`, `required`, `aria-describedby`, `aria-invalid`) spread onto
the group root.

#### `GhostRadioGroupItem`

| Prop       | Type      | Default | Contract                                                          |
| ---------- | --------- | ------- | ----------------------------------------------------------------- |
| `value`    | `string`  | —       | Stable option value; drives checked state and form `value`.       |
| `disabled` | `boolean` | `false` | Disables this option. Native group skips it for arrow navigation. |

Each item renders a native radio input. `name` comes from the group (explicit or
generated). Optional fallthrough `id` (else `useGhostId('ghost-radio-group-item')`),
`aria-*`, and listeners attach to the input. No default slot on the input; wrap in
`<label>` or use `for`/`id` like `GhostCheckbox`.

### v-model contracts

| Role     | Prop         | Emit                | Uncontrolled initial      |
| -------- | ------------ | ------------------- | ------------------------- |
| Selected | `modelValue` | `update:modelValue` | `defaultValue`, else none |

- **Uncontrolled:** omit `modelValue`. Seed from `defaultValue` when provided;
  otherwise **no** item is checked at mount (native radios with no `checked`).
- **Controlled:** defined `modelValue`. Activation (pointer or native keyboard)
  emits `update:modelValue` with the item's `value`. If the parent ignores the
  emit, restore native `:checked` after `nextTick` on the activated input (same
  policy as `GhostCheckbox`).
- **Unregistering items:** when the selected item unmounts, clear selection to
  `undefined`. Do not pick another value. When controlled, do not emit; parent
  model unchanged until it reacts to DOM. When uncontrolled, internal state
  only.
- **Form reset:** captured `defaultValue` seed (not live props; `undefined` means
  none checked). Deferred DOM reconciliation after full `reset` dispatch via
  `useNativeFormReset` on the group root's owning form.
- Switching controlled ↔ uncontrolled after setup is unsupported ([GHOST001](../warnings.md#ghost001)).

### Events, slots, and exposed methods

`GhostRadioGroup` default slot holds items. No scoped slot on the root.

`GhostRadioGroupItem` has no slot (void input).

Exposed template refs:

- `GhostRadioGroup`: `element: HTMLElement | null` (root), `focus`/`blur` on the
  selected item if any, else the first enabled item (native tab order)
- `GhostRadioGroupItem`: `element: HTMLInputElement | null`, `focus`/`blur`

## State model

| Condition              | `data-state` on item | Native              |
| ---------------------- | -------------------- | ------------------- |
| Selected               | `checked`            | `checked === true`  |
| Not selected           | omitted              | `checked === false` |
| Group or item disabled | omitted              | `disabled` (native) |

Group root `data-state`: `invalid` when `invalid` is true; `disabled` when
`disabled` and not invalid; else omitted.

## Accessibility contract

### Semantics

- Default root: `fieldset` with consumer-provided `legend` or `aria-labelledby`.
- Items: native `input type="radio"` with a shared `name` (consumer or
  generated).
- Keyboard and tab order follow the platform radio-group model per
  [Radio Group APG](https://www.w3.org/WAI/ARIA/apg/patterns/radio/). Arrow keys
  move focus **and** select. RTL is inherited from the root or ancestor `dir`.

### Keyboard

Native behavior only: arrow keys within the group select among same-name radios;
Tab enters/leaves the group at the appropriate single tab stop; Space activates
when applicable. No `useRovingFocus`.

### Field integration

`GhostField` + `GhostFieldControl` spread bindings onto `GhostRadioGroup`. The
group `id` is referenced by `GhostFieldLabel` (`for`). Description and error ids
merge into `aria-describedby` on the group root. Per-option names use wrapping
labels or `for` pointing at each item's `id`.

## Composition

- `useControllableState` for the selected value
- `useNativeFormReset` on the group root (`HTMLFieldSetElement.form`)
- `useGhostId` for generated group `name` and per-item ids
- Does not use `useRovingFocus` or `useFocusScope`

## Test plan

- Vue: v-model, uncontrolled none-selected mount, `defaultValue` seed, disabled
  group/item, controlled emit ignore + nextTick restore, form reset seed,
  generated `name`, unregister clears selection without fallback emit, Field aria
  wiring
- Browser: arrow selects without Space, shared `name` when `name` prop omitted,
  RTL horizontal arrows, form submit with selected value, axe on examples and
  playground
- Integration: themed wrapper `element` ref
- Type: consumer compile fixtures

## Documentation plan

`docs/components/radio-group.md`, examples under `examples/radio-group/` (basic,
field, form, themed), playground section with unique copy.

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking.
