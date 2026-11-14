# GhostNumberInput

`GhostNumberInput` is a locale-aware numeric spinbutton with `v-model`,
`min` / `max` / `step`, increment and decrement buttons, and clamping. Import it
from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the default
visual treatment.

## Basic use

<GhostExample id="number-input/basic" />

The spinbutton is a text field with `role="spinbutton"`. Pair it with a visible
label (or `aria-label` / `aria-labelledby`). Native attributes fall through to
the text field, not the surrounding buttons.

## API

| Prop             | Type                       | Default    | Description                                                    |
| ---------------- | -------------------------- | ---------- | -------------------------------------------------------------- |
| `modelValue`     | `number \| null`           | omitted    | Controlled value. Omit for uncontrolled mode. `null` is empty. |
| `defaultValue`   | `number \| null`           | `null`     | Initial uncontrolled value and form-reset seed.                |
| `min`            | `number`                   | omitted    | Inclusive minimum (`aria-valuemin`).                           |
| `max`            | `number`                   | omitted    | Inclusive maximum (`aria-valuemax`).                           |
| `step`           | `number`                   | `1`        | Step for buttons and arrow keys.                               |
| `locale`         | `string`                   | omitted    | `Intl.NumberFormat` locale.                                    |
| `formatOptions`  | `Intl.NumberFormatOptions` | `{}`       | Display and parse hints (for example currency).                |
| `disabled`       | `boolean`                  | `false`    | Disables the field and buttons.                                |
| `readonly`       | `boolean`                  | `false`    | Focusable; edits and buttons do not change the value.          |
| `invalid`        | `boolean`                  | `false`    | Sets `aria-invalid` on the spinbutton.                         |
| `required`       | `boolean`                  | `false`    | Native `required` on the spinbutton.                           |
| `decrementLabel` | `string`                   | `Decrease` | `aria-label` on the decrement button.                          |
| `incrementLabel` | `string`                   | `Increase` | `aria-label` on the increment button.                          |

`v-model` emits `update:modelValue` when a value commits (blur after typing,
buttons, or keyboard stepping). While typing, the draft text is local until blur.

## Bounds and clamping

<GhostExample id="number-input/bounds" />

Increment and decrement disable at `min` and `max`. Typed values clamp on blur.

## GhostField

<GhostExample id="number-input/field" />

Bind `GhostFieldControl` slot props to the spinbutton input through `v-bind`.

## Themed use

<GhostExample id="number-input/themed" />

| Prop    | Type                   | Default | Description                 |
| ------- | ---------------------- | ------- | --------------------------- |
| `size`  | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control size.               |
| `block` | `boolean`              | `false` | Stretch to available width. |

## Component refs

<GhostExample id="number-input/ref" />

The ref exposes `element`, `focus`, `blur`, `increment`, and `decrement`.

## Accessibility

Follows the [WAI-ARIA spinbutton pattern](https://www.w3.org/WAI/ARIA/apg/patterns/spinbutton/).
Arrow keys, Home, End, and Page Up/Down adjust the value while the spinbutton is
focused. Tab targets the spinbutton only; buttons are pointer and programmatic
accessories (`tabindex="-1"`).

## Styling hooks

- Root: `ghost-number-input`, `data-part="root"`, optional `data-state`
- Input: `ghost-number-input__input`, `data-part="input"`
- Buttons: `ghost-number-input__button`, `data-part="decrement"` | `"increment"`
