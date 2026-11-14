# GhostInput

`GhostInput` is an unstyled native single-line text control with a string
`v-model` and first-class disabled, readonly, invalid, and required states.
Import it from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for
the default visual treatment.

## Basic use

<GhostExample id="input/basic" />

The root is always a native `<input>`. Pair it with a real `<label>` (or
`aria-label` / `aria-labelledby`). Placeholder text is not a name.
`GhostField` is not required; pass `id` and `aria-*` as ordinary attributes
so a future Field can wire the same control.

Headless use of the same contract without the SFC:

<GhostExample id="input/composable" />

## API

| Prop           | Type                                                            | Default  | Description                                                                                  |
| -------------- | --------------------------------------------------------------- | -------- | -------------------------------------------------------------------------------------------- |
| `modelValue`   | `string`                                                        | omitted  | Controlled value. Omit for uncontrolled mode. `''` is a real empty value.                    |
| `defaultValue` | `string`                                                        | `''`     | Initial uncontrolled value. Later changes are ignored.                                       |
| `type`         | `'text' \| 'search' \| 'email' \| 'password' \| 'tel' \| 'url'` | `'text'` | Native text-like type. Checkbox, radio, file, and `number` are out of scope.                 |
| `disabled`     | `boolean`                                                       | `false`  | Native disabled: not focusable, not submitted.                                               |
| `readonly`     | `boolean`                                                       | `false`  | Native readonly: focusable and submitted, not editable.                                      |
| `invalid`      | `boolean`                                                       | `false`  | Consumer-owned validity. Sets `aria-invalid="true"`. Does not mirror native `ValidityState`. |
| `required`     | `boolean`                                                       | `false`  | Native required constraint.                                                                  |

`v-model` emits `update:modelValue` on the native `input` event, matching Vue
on a plain `<input>`. Native listeners such as `@change` and `@blur` still
attach to the element. Do not pass a native `value` attribute for the current
text.

The component does not generate an `id`. There is no content slot.

## Themed use

<GhostExample id="input/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop    | Type                   | Default | Description                     |
| ------- | ---------------------- | ------- | ------------------------------- |
| `size`  | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control size.                   |
| `block` | `boolean`              | `false` | Stretch to the available width. |

Themed size, padding, radius, and type come from density and control tokens.
Comfortable `md` is 40px tall with an 8px radius at `--ghost-roundness: 1`.
See [density, type, and roundness](../themes/density.md). There are no
per-component tokens.

You can also import the stylesheet and wrap unstyled inputs in `.ghost-theme`
when you want a region of headless components to pick up the defaults. See the
[default theme guide](../themes/default.md).

## Disabled, readonly, invalid, and required

<GhostExample id="input/states" />

Disabled uses the native `disabled` attribute. Readonly uses native `readonly`.
Required uses native `required`. Invalid is a consumer flag for custom or async
errors; native constraint validation still runs on submit for `required` /
`pattern` / `maxlength`.

## Search

`type="search"` keeps native search behavior for DataTable-style filters:

<GhostExample id="input/search" />

## Component refs

<GhostExample id="input/ref" />

The ref exposes `element`, `focus(options?)`, and `blur()`. Before mount and
after unmount, `element` is `null` and the methods are safe no-ops. Use
`element` for `select()` or selection APIs.

## Styling

The unstyled component renders one native `<input>` with class `ghost-input`,
`data-part="root"`, and `data-state` of `invalid`, `disabled`, or `readonly`.
Invalid wins when those overlap because native `disabled` / `readonly` already
cover unavailability. There is no internal wrapper to target.

```css
.ghost-input[data-state='invalid'] {
  /* Applies while invalid, including when also disabled. */
}
```

The themed wrapper sets `data-size` and `data-block` from visual props. The
default size omits `data-size`.

## Accessibility and environment behavior

The control is a native textbox. Name it with a `<label>` or ARIA naming
attributes. Descriptions and errors attach through `aria-describedby`.
Keyboard editing is native; the component adds no key handlers. Disabled
fields are not in the tab order; readonly fields are.

SSR markup is deterministic from props and the current string. Setup does not
read browser globals. An owner form `reset` restores the uncontrolled seed.

See the [GhostInput specification](./input-spec.md) for the complete behavior
and compatibility contract.
