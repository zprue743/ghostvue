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

<!-- @generated docs-api:vue/ghost-slider begin -->

<!-- Source: packages/vue/manifests/ghost-slider.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type                         | Default        | Description                                                                                                                             |
| -------------- | ---------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultValue` | `GhostSliderValue`           | —              | Uncontrolled seed and form-reset baseline.                                                                                              |
| `disabled`     | `boolean`                    | `false`        | Non-operable; hidden inputs not submitted.                                                                                              |
| `form`         | `string`                     | —              | External form association.                                                                                                              |
| `max`          | `number`                     | `100`          | Upper bound.                                                                                                                            |
| `messages`     | `GhostSliderMessages`        | —              | Overridable range-thumb naming strings (`minimum`, `maximum`) and `aria-label` formatters (`formatMinimumLabel`, `formatMaximumLabel`). |
| `min`          | `number`                     | `0`            | Lower bound.                                                                                                                            |
| `modelValue`   | `GhostSliderValue`           | —              | Controlled value; tuple when `range` is true.                                                                                           |
| `name`         | `string`                     | —              | Primary hidden field name.                                                                                                              |
| `nameMax`      | `string`                     | —              | High thumb name when `range` is true.                                                                                                   |
| `orientation`  | `'horizontal' \| 'vertical'` | `"horizontal"` | Axis and keyboard mapping.                                                                                                              |
| `range`        | `boolean`                    | `false`        | Two-thumb interval mode.                                                                                                                |
| `step`         | `number`                     | `1`            | Snap increment.                                                                                                                         |
| `valueText`    | `string`                     | —              | `aria-valuetext` for single-thumb mode.                                                                                                 |

| Slot      | Slot props | Description                                                          |
| --------- | ---------- | -------------------------------------------------------------------- |
| `default` | —          | Optional inner content. Prefer aria-labelledby or an external label. |

<!-- @generated docs-api:vue/ghost-slider end -->

<!-- @generated docs-api:themes/ghost-slider begin -->

<!-- Source: packages/themes/manifests/ghost-slider.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostSlider` API, which it forwards:

| Prop   | Type                                | Default    | Description                                              |
| ------ | ----------------------------------- | ---------- | -------------------------------------------------------- |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `"accent"` | Semantic color intent for the range fill and thumb ring. |
| `size` | `'sm' \| 'md' \| 'lg'`              | `"md"`     | Track thickness and thumb diameter.                      |

<!-- @generated docs-api:themes/ghost-slider end -->

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
