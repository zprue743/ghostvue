# GhostSlider

`GhostSlider` is a range input with WAI-ARIA slider semantics. It supports
single values and optional two-thumb intervals, native form participation
through hidden inputs, and horizontal or vertical orientation. Keyboard support
follows the APG Slider pattern (arrows, Page Up/Down, Home, End).

<GhostExample id="slider/audio-mixer" />

The mastering panel composes themed single-thumb, two-thumb `range`, and
`disabled` `GhostSlider` controls inside `GhostCard` with live numeric readouts.

## Basic use

<GhostExample id="slider/basic" />

## Range mode

Enable `range` and bind `v-model` to a two-number tuple. Each thumb keeps the
interval valid (low does not cross high).

<GhostExample id="slider/range" />

## Themed vertical

The themed wrapper adds track, fill, and thumb recipes via `size` and `tone`.
Track and fill share `--ghost-track-thickness-*` (4 / 6 / 8px) and the thumb uses
`--ghost-track-thumb-*` (12 / 16 / 20px) at every density and theme. Transparent
hit areas grow the track and thumb to at least `--ghost-track-target` (24px)
without changing layout or the focus ring.

<GhostExample id="slider/vertical" />

## API

| Prop           | Type                         | Default        | Description                                                                                                                             |
| -------------- | ---------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `v-model`      | `number \| [number, number]` | —              | Controlled value; tuple when `range` is true.                                                                                           |
| `defaultValue` | same                         | `min` / tuple  | Uncontrolled seed and form-reset baseline.                                                                                              |
| `min`          | `number`                     | `0`            | Lower bound.                                                                                                                            |
| `max`          | `number`                     | `100`          | Upper bound.                                                                                                                            |
| `step`         | `number`                     | `1`            | Snap increment.                                                                                                                         |
| `range`        | `boolean`                    | `false`        | Two-thumb interval mode.                                                                                                                |
| `orientation`  | `'horizontal' \| 'vertical'` | `'horizontal'` | Axis and keyboard mapping.                                                                                                              |
| `disabled`     | `boolean`                    | `false`        | Non-operable; hidden inputs not submitted.                                                                                              |
| `name`         | `string`                     | —              | Primary hidden field name.                                                                                                              |
| `nameMax`      | `string`                     | —              | High thumb name when `range` is true.                                                                                                   |
| `form`         | `string`                     | —              | External form association.                                                                                                              |
| `valueText`    | `string`                     | —              | `aria-valuetext` for single-thumb mode.                                                                                                 |
| `messages`     | `GhostSliderMessages`        | —              | Overridable range-thumb naming strings (`minimum`, `maximum`) and `aria-label` formatters (`formatMinimumLabel`, `formatMaximumLabel`). |

Native attributes (`id`, `class`, `aria-labelledby`, and listeners) fall
through to the root (`data-part="root"`). Thumbs expose `role="slider"` with
`aria-valuenow` / `aria-valuemin` / `aria-valuemax`.

### Template ref

`GhostSliderExposed` provides `element`, `value`, `focus()`, and `blur()`.

## Accessibility

Provide an accessible name on the root (`aria-label` or `aria-labelledby`).
In range mode, each thumb is its own slider with constrained min/max. Arrow keys
adjust the focused thumb; RTL flips horizontal arrows. See
[slider-spec.md](/specs/slider) for the full contract.
