# GhostNumberInput

`GhostNumberInput` is a locale-aware numeric spinbutton with `v-model`,
`min` / `max` / `step`, increment and decrement buttons, and clamping. Import it
from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the default
visual treatment.

<GhostExample id="number-input/order-limits" />

The quota form pairs themed `GhostNumberInput` with `GhostField`: active seats
clamp between 1 and 50, the spend cap formats as USD currency in $50 steps, and
the disabled legacy quota scales its stepper buttons at `size="sm"`.

## Basic use

<GhostExample id="number-input/basic" />

The spinbutton is a text field with `role="spinbutton"`. Pair it with a visible
label (or `aria-label` / `aria-labelledby`). Native attributes fall through to
the text field, not the surrounding buttons.

## API

<!-- @generated docs-api:vue/ghost-number-input begin -->

<!-- Source: packages/vue/manifests/ghost-number-input.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop             | Type                       | Default      | Description                                                    |
| ---------------- | -------------------------- | ------------ | -------------------------------------------------------------- |
| `decrementLabel` | `string`                   | `"Decrease"` | `aria-label` on the decrement button.                          |
| `defaultValue`   | `null \| number`           | `null`       | Initial uncontrolled value and form-reset seed.                |
| `disabled`       | `boolean`                  | `false`      | Disables the field and buttons.                                |
| `formatOptions`  | `Intl.NumberFormatOptions` | —            | Display and round-trip parse options (`notation: 'standard'`). |
| `incrementLabel` | `string`                   | `"Increase"` | `aria-label` on the increment button.                          |
| `invalid`        | `boolean`                  | `false`      | Sets `aria-invalid` on the spinbutton.                         |
| `locale`         | `string`                   | —            | `Intl.NumberFormat` locale.                                    |
| `max`            | `number`                   | —            | Inclusive maximum (`aria-valuemax`).                           |
| `min`            | `number`                   | —            | Inclusive minimum (`aria-valuemin`).                           |
| `modelValue`     | `null \| number`           | —            | Controlled value. Omit for uncontrolled mode. `null` is empty. |
| `readonly`       | `boolean`                  | `false`      | Focusable; edits and buttons do not change the value.          |
| `required`       | `boolean`                  | `false`      | Native `required` on the spinbutton.                           |
| `step`           | `number`                   | `1`          | Step for buttons and arrow keys.                               |

<!-- @generated docs-api:vue/ghost-number-input end -->

`v-model` emits `update:modelValue` when a value commits (blur after typing,
Enter, buttons, or keyboard stepping). While typing, the draft text is local
until commit.

## Locale and format parsing contract

`GhostNumberInput` formats and round-trip parses `Intl.NumberFormat` outputs for
`notation: 'standard'` (the default) across `decimal`, `currency` (including
`currencySign: 'accounting'`), `percent`, and `unit` styles:

- **Affixes and signs**: Currency symbols/codes, unit labels, percent signs,
  accounting parentheses `(...)`, `signDisplay` markers, and Unicode bidi
  control characters are stripped based on `Intl.NumberFormat.formatToParts`.
  Drafts with or without the configured currency/unit/percent affixes parse to
  the same numeric model value.
- **Percent scaling**: In `style: 'percent'`, both `60%` and plain `60` commit
  to `modelValue = 0.6` (and submit `0.6` via the hidden form input).
- **Localized digits**: Both the locale's `numberingSystem` digits (such as
  Eastern Arabic-Indic `٠–٩` or Persian `۰–۹`) and ASCII `0–9` are accepted.
- **Grouping**: Locale group separators are optional, but when present they must
  match the locale's grouping sizes (for example, `1.234,5` is valid in `de-DE`,
  while malformed grouping like `1.5` in `de-DE` is rejected and reverts to the
  last committed value).
- **Non-standard notations**: `compact`, `scientific`, and `engineering`
  notations are outside the editing contract and are not parsed.

## Bounds and clamping

<GhostExample id="number-input/bounds" />

Increment and decrement disable at `min` and `max`. Typed values clamp on blur.

## GhostField

<GhostExample id="number-input/field" />

Bind `GhostFieldControl` slot props to the spinbutton input through `v-bind`.

## Themed use

<GhostExample id="number-input/themed" />

<!-- @generated docs-api:themes/ghost-number-input begin -->

<!-- Source: packages/themes/manifests/ghost-number-input.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostNumberInput` API, which it forwards:

| Prop    | Type                   | Default | Description                                |
| ------- | ---------------------- | ------- | ------------------------------------------ |
| `size`  | `'sm' \| 'md' \| 'lg'` | `"md"`  | Control size. Default omits data-size.     |
| `block` | `boolean`              | `false` | Stretch to available width via data-block. |

<!-- @generated docs-api:themes/ghost-number-input end -->

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
