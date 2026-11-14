# GhostSlider specification

**Status:** Proposed for GHO-88. Spec and implementation ship together; Zac
approves both in PR review.

## Purpose and user problems

`GhostSlider` is a range input with WAI-ARIA slider semantics. It lets users
pick one numeric value along a bounded axis, or two values that define an
interval. Assistive technology encounters `role="slider"` with `aria-valuemin`,
`aria-valuemax`, and `aria-valuenow` (and optional `aria-valuetext`).
Sighted users drag thumbs along a track. Immediate consumers include numeric
range filters in data tables and settings where a continuous or stepped value
is clearer than a free-text field.

The control participates in native HTML forms through hidden inputs, and
`form.reset()` restores the mounted defaults via the same policy as
`GhostInput` and `GhostCheckbox`.

## Non-goals

- It is not a progress indicator (`GhostProgress`) or meter. Values are edited,
  not displayed.
- It is not a native `<input type="range">`. Native range inputs are a replaced
  element with uneven styling and no stable `data-part` children for theming.
- It does not own labeling primitives (`GhostField`, GHO-71). Consumers supply
  names through `aria-label`, `aria-labelledby`, or visible labels associated
  with the control.
- It does not implement tick marks, value labels along the track, or an
  editable numeric companion field. Those are composition.
- It does not implement time or date picking; `min` / `max` / `step` are plain
  numbers in the same unit the consumer chooses.
- The unstyled component ships minimal layout only (percentage-positioned thumbs
  and an optional range fill). Track cosmetics belong to the themed wrapper.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostSlider` / `useGhostSlider`:

| Prop           | Type                        | Default   | Contract                                                                                                                                 |
| -------------- | --------------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `modelValue`   | `number \| [number, number]` | omitted   | Controlled value. Single-thumb mode uses a number; `range` mode uses a readonly two-tuple `[minThumb, maxThumb]`. Omitted is uncontrolled. |
| `defaultValue` | same as `modelValue`        | `min` or `[min, max]` in range mode | Initial value when `modelValue` is omitted. Captured at mount for reset; later prop changes ignored.                      |
| `min`          | `number`                    | `0`       | Lower bound. Must be finite and `<= max` after coercion.                                                                               |
| `max`          | `number`                    | `100`     | Upper bound. Must be finite and `>= min`.                                                                                                |
| `step`         | `number`                    | `1`       | Snap increment. Must be finite and `> 0`; invalid values fall back to `1`.                                                               |
| `range`        | `boolean`                   | `false`   | When `true`, two thumbs select an interval; `modelValue` / `defaultValue` use tuples.                                                    |
| `orientation`  | `'horizontal' \| 'vertical'` | `'horizontal'` | Maps to `aria-orientation` and keyboard axis.                                                                     |
| `disabled`     | `boolean`                   | `false`   | Native disabled: thumbs not operable, not focusable, hidden inputs not submitted.                                                        |
| `name`         | `string`                    | omitted   | Form field name for the primary (or only) value. Hidden `type="hidden"`.                                                                 |
| `nameMax`      | `string`                    | omitted   | In `range` mode, form field name for the high thumb. Ignored when `range` is false.                                                      |
| `form`         | `string`                    | omitted   | Associates hidden inputs with an external form id.                                                                                       |
| `valueText`    | `string`                    | omitted   | Optional `aria-valuetext` for the focused thumb when set; per-thumb overrides may use fallthrough on a thumb.                            |

Native attributes and listeners fall through to the **root** track container
(`data-part="root"`). The component owns `aria-orientation` on the root when
vertical, thumb `role` / value attributes, and `data-state` hooks. Do not
redeclare owned ARIA as camelCase props except `valueText` on the composable
for the simple single-thumb case.

Named ESM exports: `GhostSlider`, `useGhostSlider`, and the types above.
Headless behavior lives in the composable; the SFC renders root, track, optional
`data-part="range"` fill, one or two `data-part="thumb"` hosts with
`role="slider"`, and hidden form inputs.

Themed `@ghostvue/themes` `GhostSlider` wraps the unstyled component and adds
visual props:

| Prop   | Type                                | Default    | Contract                                                                             |
| ------ | ----------------------------------- | ---------- | ------------------------------------------------------------------------------------ |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Track thickness and thumb size. Default omits `data-size`.                           |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Selected range and thumb color intent. Default omits `data-tone`.                  |

### v-model contracts

`v-model` binds `modelValue` / `update:modelValue`.

- Omitted `modelValue` is uncontrolled. Local state starts at `defaultValue`
  (single: `min`; range: `[min, max]` unless `defaultValue` is provided).
- A defined `modelValue` is controlled. Writes emit `update:modelValue` and do
  not update local state when controlled.
- Assignment is skipped when the snapped value is unchanged (`Object.is` for
  numbers; tuple compared by element with `Object.is`).
- Switching controlled/uncontrolled at runtime logs `GHOST001` in development.
- **Form reset** restores the mount-captured `defaultValue`, using `nextTick`
  before reconciling hidden input DOM when controlled, matching
  `GhostCheckbox` / `GhostInput`.

### Events, callbacks, slots, and exposed methods

No extra events besides `update:modelValue`. Pointer and keyboard interaction
on thumbs update the model.

The default slot is optional inner content (for example a visible label inside
the control). Prefer sibling `<label>` or `aria-labelledby` when the name should
sit outside the track.

Template ref (`GhostSliderExposed`):

- `element`: root `HTMLElement | null`
- `value`: current number or readonly tuple (mirrors the model)
- `focus(options?)`: focuses the first enabled thumb
- `blur()`: blurs the active thumb if inside the control

### Value snapping and range invariants

Values are clamped to `[min, max]` and snapped to the nearest valid step from
`min`. In `range` mode the low thumb never exceeds the high thumb; crossing
attempts move the opposite thumb or clamp at the collision.

Page Up / Page Down use a large step of `max(step * 10, (max - min) / 10)` unless
`step` already equals the full span.

## State model

Disabled suppresses pointer and keyboard changes and removes thumbs from the tab
order. Read-only is **out of scope** for v1 (unlike `GhostSwitch`).

`data-state` on the root is omitted; thumbs may set `data-focus` when focused for
theming.

## Accessibility contract

### Semantics and relationships

Follows
[Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) and
[Multi-Thumb Slider](https://www.w3.org/WAI/ARIA/apg/patterns/slider-multithumb/)
patterns.

- Root: `div.ghost-slider` with `data-part="root"`. No `role` on the root.
- Each thumb: `div` with `role="slider"`, `tabindex="0"` when enabled,
  `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, optional
  `aria-valuetext`, optional `aria-orientation` when vertical.
- In range mode each thumb gets its own effective min/max (low thumb max is high
  value; high thumb min is low value).
- Track and range fill: `aria-hidden="true"`.
- Hidden inputs: not focusable; participate in forms only.

### Keyboard interaction

On the focused thumb (APG slider):

| Key                    | Horizontal LTR     | Horizontal RTL | Vertical        |
| ---------------------- | ------------------ | -------------- | --------------- |
| Arrow toward max       | ArrowRight         | ArrowLeft      | ArrowUp         |
| Arrow toward min       | ArrowLeft          | ArrowRight     | ArrowDown       |
| Large step toward max  | PageUp             | PageUp         | PageUp          |
| Large step toward min  | PageDown           | PageDown       | PageDown        |
| Minimum                | Home               | Home           | Home            |
| Maximum                | End                | End            | End             |

RTL is resolved from `dir` on the root or an ancestor, same as
`useRovingFocus`. Arrow keys do **not** move focus between thumbs; Tab moves to
the next thumb in range mode.

### Focus behavior

Thumbs are in document tab order. Focus outline is the consumer's or theme's
responsibility on `[data-part="thumb"]`.

### Assistive technology expectations

Value changes update `aria-valuenow` immediately. Consumers should provide an
accessible name on the root via fallthrough `aria-label` / `aria-labelledby`.

## Rendering and customization

Headless `data-part` hooks:

| Part    | Description                                      |
| ------- | ------------------------------------------------ |
| `root`  | Positioning context and attribute fallthrough host |
| `track` | Full span of the axis                            |
| `range` | Selected interval fill (range mode or single fill from min) |
| `thumb` | Draggable value handle (`data-thumb-index` `0` \| `1`) |

Thumbs are positioned with inline axis percentage. Vertical sliders use block
axis percentage on the thumb.

## Environment behavior

### SSR and hydration

No `window` in setup. Values render deterministically from props/state. Pointer
listeners attach on mount.

### Mobile and touch

Pointer drag on thumbs is supported. Touch follows the same snapping rules.

## Performance

Single- and two-thumb instances only; no virtualization.

## Composition

- `useControllableState` for the model.
- `useNativeFormReset` + `afterNativeFormReset` policy from `form-reset.ts`.
- **Does not** use `useRovingFocus`; slider arrows adjust values, not focus.
- `useGhostId` is unused in v1.

## Test plan

- Unit tests: snapping, step/page step, range invariants, controlled emit,
  uncontrolled local writes, RTL arrow mapping, form hidden values, reset
  baseline.
- Browser: keyboard on playground, form submit/reset, axe on playground section
  and each registry example (light/dark).
- Type tests: `GhostSliderProps` fallthrough and v-model types.
- Themed integration: `element` ref targets the unstyled root inside the scope.

## Documentation plan

- API reference at `docs/components/slider.md`
- Examples: `slider/basic` (single), `slider/range`, `slider/vertical`
- Playground section `GhostSlider` with unique status strings

## Compatibility and release impact

New minor features on `@ghostvue/vue` and `@ghostvue/themes`. Changeset
required.

## Open architectural questions

None blocking v1. Multi-thumb label composition (one name vs per-thumb) is left
to consumer `aria-labelledby` until `GhostField` exists.