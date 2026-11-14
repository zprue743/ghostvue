# GhostNumberInput specification

**Status:** Proposed for GHO-89. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostNumberInput` is a locale-aware numeric spinbutton for forms and DataTable
surfaces. It provides a string-safe editing experience with `Intl.NumberFormat`
display, `min` / `max` / `step` constraints, optional increment and decrement
buttons, and clamping while keeping Vue `v-model` updates predictable.

Primary consumers are page-size controls and numeric column filters in
DataTable. The component composes with `GhostField` through native attribute
fallthrough on the spinbutton text field.

## Non-goals

- Not `GhostInput` (GHO-70). No arbitrary text types or native `type="number"`.
- Not `GhostSlider` (GHO-88). No range track or pointer scrubbing.
- Not a calculator, expression parser, or scientific-notation editor.
- Not currency unit conversion or IME composition beyond native platform behavior.
- No visual styles in the unstyled package; themed chrome lives in
  `@ghostvue/themes`.
- No custom increment/decrement slot API in v1; buttons are built-in parts with
  overridable labels via props.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostNumberInput` / `useGhostNumberInput`:

| Prop             | Type                       | Default      | Contract                                                                         |
| ---------------- | -------------------------- | ------------ | -------------------------------------------------------------------------------- |
| `modelValue`     | `number \| null`           | omitted      | Controlled numeric value. `undefined` is uncontrolled; `null` is an empty field. |
| `defaultValue`   | `number \| null`           | `null`       | Initial uncontrolled value. Later changes ignored. Form-reset seed.              |
| `min`            | `number`                   | omitted      | Minimum inclusive bound. Sets `aria-valuemin` when defined.                      |
| `max`            | `number`                   | omitted      | Maximum inclusive bound. Sets `aria-valuemax` when defined.                      |
| `step`           | `number`                   | `1`          | Step for increment, decrement, and arrow keys. Must be &gt; 0.                   |
| `locale`         | `string`                   | `undefined`  | `Intl.NumberFormat` locale. Default is runtime default locale.                   |
| `formatOptions`  | `Intl.NumberFormatOptions` | `{}`         | Passed to `Intl.NumberFormat` (for example `maximumFractionDigits`).             |
| `disabled`       | `boolean`                  | `false`      | Disables editing, buttons, and sequential focus for the control.                 |
| `readonly`       | `boolean`                  | `false`      | Focusable and submitted; typing and buttons do not change value.                 |
| `invalid`        | `boolean`                  | `false`      | Consumer validity. Sets `aria-invalid` on the spinbutton.                        |
| `required`       | `boolean`                  | `false`      | Native `required` on the spinbutton input.                                       |
| `decrementLabel` | `string`                   | `'Decrease'` | Accessible name for the decrement button when no visible text.                   |
| `incrementLabel` | `string`                   | `'Increase'` | Accessible name for the increment button when no visible text.                   |

Named exports: `GhostNumberInput`, `useGhostNumberInput`, and related types.
The SFC is a three-part widget: decrement button, spinbutton text field, and
increment button inside a root container.

Native attributes and listeners fall through to the spinbutton `<input>` (not the
root or buttons). Consumers attach `id`, `name`, `aria-labelledby`,
`aria-describedby`, and `inputmode` there. Declared props own numeric bounds,
locale, labels, disabled/readonly/invalid/required, and model state.

Themed `@ghostvue/themes` `GhostNumberInput` adds:

| Prop    | Type                   | Default | Contract                                    |
| ------- | ---------------------- | ------- | ------------------------------------------- |
| `size`  | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control density; default omits `data-size`. |
| `block` | `boolean`              | `false` | Stretch via `data-block` on the root.       |

### v-model contracts

`v-model` binds `modelValue` as `number | null` and emits `update:modelValue`
with the next value. **`modelValue` defined** means controlled; omitting it is
uncontrolled. `null` is a defined empty value, not “unset mode.”

`useControllableState` handles writes:

1. Skip when `Object.is(current, next)`.
2. Uncontrolled: update local state immediately.
3. Emit synchronously.

Committed updates happen when:

- The user blurs the spinbutton after editing.
- Arrow Up/Down, Home, or End apply a step or bound while focused.
- Increment or decrement buttons activate.
- Form reset restores the captured `defaultValue`.

While focused and typing, a local draft string may diverge from the formatted
display. On blur, the draft is parsed with locale-aware rules, clamped to
`min`/`max`, committed, and reformatted. Invalid drafts revert to the last
committed value without emit.

Do not synchronously restore the spinbutton DOM after emit while controlled;
reconcile on `nextTick` only when the parent ignored the emit, matching
`GhostInput`.

`defaultValue` seeds uncontrolled state once at setup and is the GhostVue form
reset baseline. Later `defaultValue` changes are ignored.

### Events, callbacks, slots, and exposed methods

No slots in v1.

No component-specific events besides `update:modelValue`. Native `@focus`,
`@blur`, and `@keydown` attach through fallthrough on the spinbutton.

Template ref exposes:

- `element: HTMLInputElement | null` — the spinbutton field
- `focus(options?: FocusOptions): void`
- `blur(): void`
- `increment(): void` / `decrement(): void` — programmatic step when enabled

## State model

Value is `number | null` plus configuration flags. `data-state` precedence matches
`GhostInput`: `invalid`, then `disabled`, then `readonly`, else omitted.

Increment and decrement disable at `min`/`max` when the next step would exceed
bounds. Empty (`null`) increments to `min` when defined, otherwise `0`, then
steps.

### Loading, empty, disabled, read-only, and error states

`null` is an empty spinbutton: omit `aria-valuenow`; `aria-valuetext` is empty.

Disabled disables buttons and the text field. Readonly keeps focus but blocks
edits and button activation.

## Consumer data

The model is `number | null`. No mutation of caller-owned objects.

## Accessibility contract

### Semantics and relationships

Root `span.ghost-number-input` with `data-part="root"`. The text field is
`input[type="text"][role="spinbutton"]` with:

- `aria-valuemin`, `aria-valuemax` when bounds exist
- `aria-valuenow` when value is a number
- `aria-valuetext` from `Intl.NumberFormat` when value is a number

Buttons are `type="button"` with `data-part="decrement"` / `"increment"` and
`aria-label` from label props. They are not in tab order (`tabindex="-1"`);
keyboard users change value from the spinbutton per APG.

Follows [WAI-ARIA spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/).

### Keyboard interaction

On the spinbutton (enabled, not readonly):

- `ArrowUp` / `ArrowDown`: increment / decrement by `step`, clamped
- `Home` / `End`: jump to `min` / `max` when defined
- `PageUp` / `PageDown`: increment / decrement by `step * 10`, clamped
- Printable input follows native text editing until blur commit

Disabled: no edits. Readonly: focus and selection only.

### Focus behavior

Tab targets the spinbutton only. Buttons are pointer/focus-programmatic
accessories. Focus ring styling targets the spinbutton and themed buttons.

## Rendering and customization

Styling hooks:

- Root: class `ghost-number-input`, `data-part="root"`, optional `data-state`
- Input: class `ghost-number-input__input`, `data-part="input"`
- Buttons: class `ghost-number-input__button`, `data-part="decrement"` | `"increment"`

Themed recipe lays out flex row; input recipe reuses control tokens aligned with
`ghost-input`.

## Environment behavior

### SSR and hydration

Deterministic from props and model. `Intl` runs in supported environments;
examples use stable locales where snapshots require it.

### Mobile and touch

`inputmode="decimal"` is set by default; consumers may override via fallthrough.

## Performance

`Intl.NumberFormat` instances are memoized per locale/options key. No global
listeners beyond optional form `reset` on the owner form.

## Composition

`useGhostNumberInput` owns parsing, formatting, clamping, stepping, ARIA value
attributes, and reset reconciliation. `useNativeFormReset` targets the
spinbutton element. `GhostField` supplies `id`, `disabled`, `invalid`, `required`,
and `aria-describedby` through `GhostFieldControl` slot props.

## Test plan

- Vue tests: defaults, uncontrolled/control, min/max/step clamping, increment
  buttons, arrow/home/end keys, locale format and parse, disabled/readonly/
  invalid/required, `data-state`, form reset, controlled `nextTick` reconcile,
  exposed methods, fallthrough attrs on spinbutton.
- Browser tests: labeled playground and examples, keyboard stepping, axe on
  registry examples (light/dark).
- Type tests: props and exposed ref contracts.
- Visual: themed example baselines.

## Documentation plan

`docs/components/number-input.md` with API, Field composition, bounds, locale,
themed sizes, refs, accessibility, and styling hooks. Examples: basic, field,
bounds, locale, themed, composable, ref.

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.

## Open architectural questions

None blocking. Uses existing `data-part` / `data-state` hooks (not GHO-38).
