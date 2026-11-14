# GhostSlider

`GhostSlider` is a range input with WAI-ARIA slider semantics. It supports
single values and optional two-thumb intervals, native form participation
through hidden inputs, and horizontal or vertical orientation. Keyboard support
follows the APG Slider pattern (arrows, Page Up/Down, Home, End).

<GhostExample id="slider/basic" />

## Range mode

Enable `range` and bind `v-model` to a two-number tuple. Each thumb keeps the
interval valid (low does not cross high).

<GhostExample id="slider/range" />

## Themed vertical

The themed wrapper adds track, fill, and thumb recipes via `size` and `tone`.

<GhostExample id="slider/vertical" />

## API

| Prop           | Type                         | Default        | Description                                   |
| -------------- | ---------------------------- | -------------- | --------------------------------------------- |
| `v-model`      | `number \| [number, number]` | —              | Controlled value; tuple when `range` is true. |
| `defaultValue` | same                         | `min` / tuple  | Uncontrolled seed and form-reset baseline.    |
| `min`          | `number`                     | `0`            | Lower bound.                                  |
| `max`          | `number`                     | `100`          | Upper bound.                                  |
| `step`         | `number`                     | `1`            | Snap increment.                               |
| `range`        | `boolean`                    | `false`        | Two-thumb interval mode.                      |
| `orientation`  | `'horizontal' \| 'vertical'` | `'horizontal'` | Axis and keyboard mapping.                    |
| `disabled`     | `boolean`                    | `false`        | Non-operable; hidden inputs not submitted.    |
| `name`         | `string`                     | —              | Primary hidden field name.                    |
| `nameMax`      | `string`                     | —              | High thumb name when `range` is true.         |
| `form`         | `string`                     | —              | External form association.                    |
| `valueText`    | `string`                     | —              | `aria-valuetext` for single-thumb mode.       |

Native attributes (`id`, `class`, `aria-labelledby`, and listeners) fall
through to the root (`data-part="root"`). Thumbs expose `role="slider"` with
`aria-valuenow` / `aria-valuemin` / `aria-valuemax`.

### Template ref

`GhostSliderExposed` provides `element`, `value`, `focus()`, and `blur()`.

## Accessibility

Provide an accessible name on the root (`aria-label` or `aria-labelledby`).
In range mode, each thumb is its own slider with constrained min/max. Arrow keys
adjust the focused thumb; RTL flips horizontal arrows. See
[slider-spec.md](./slider-spec.md) for the full contract.
