# GhostTextarea

`GhostTextarea` is an unstyled native multiline text control with Vue
`v-model`, form participation, and optional auto-resize. Import it from
`@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the default
field treatment.

## Basic use

<GhostExample id="textarea/basic" />

Every instance needs an accessible name. Pair it with a `<label for>` (or
`aria-label` / `aria-labelledby`) and pass the matching `id`. A future
`GhostField` will own that wiring; until then native `id` and `aria-*`
fallthrough are the integration surface.

Headless use of the same contract without the SFC:

<GhostExample id="textarea/composable" />

## API

| Prop           | Type      | Default | Description                                                                                    |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| `modelValue`   | `string`  | omitted | Controlled value. Omit for uncontrolled mode.                                                  |
| `defaultValue` | `string`  | `''`    | Initial uncontrolled value.                                                                    |
| `disabled`     | `boolean` | `false` | Native disabled: not focusable, not submitted.                                                 |
| `readonly`     | `boolean` | `false` | Native readonly: focusable and submitted; edits are rejected.                                  |
| `invalid`      | `boolean` | `false` | Sets `aria-invalid="true"`. Error text belongs to the surrounding form.                        |
| `required`     | `boolean` | `false` | Native required constraint.                                                                    |
| `rows`         | `number`  | `2`     | Native rows. Auto-resize uses this as the minimum height.                                      |
| `maxRows`      | `number`  | omitted | Auto-resize ceiling. Ignored unless `autoResize` is set.                                       |
| `autoResize`   | `boolean` | `false` | Grow with content after mount. Off so native resize and a fixed height stay the ordinary path. |

`v-model` is a `string` (`modelValue` / `update:modelValue`). Native textarea
attributes and listeners fall through to the root, including `id`, `name`,
`placeholder`, `maxlength`, and Field-ready `aria-describedby` /
`aria-errormessage`. The component does not generate ids.

## Disabled, readonly, invalid, and required

<GhostExample id="textarea/states" />

Disabled removes the field from tab order and form submit. Readonly keeps it
focusable. Invalid is consumer-owned and does not render error copy.

## Auto-resize

<GhostExample id="textarea/auto-resize" />

Measurement runs after mount, on input, and when the field's width changes.
Server HTML keeps the `rows` height and never writes an inline `height`, so
hydration stays aligned. `maxRows` caps growth; leftover lines scroll.

## Native forms

<GhostExample id="textarea/form" />

The control is a real `<textarea>`. `Enter` inserts a newline and does not
submit. Use a separate submit button.

## Themed use

<GhostExample id="textarea/themed" />

Importing the themed component loads the default stylesheet. Visual props
exist only on this wrapper:

| Prop   | Type                   | Default | Description            |
| ------ | ---------------------- | ------- | ---------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Padding and font size. |

You can also import the stylesheet and wrap unstyled textareas in
`.ghost-theme` when you want a region of headless components to pick up the
defaults. See the [default theme guide](../themes/default.md).

## Component refs

<GhostExample id="textarea/ref" />

The ref exposes `element`, `focus(options?)`, and `blur()`. Before mount and
after unmount, `element` is `null` and the methods are safe no-ops.

## Styling

The unstyled component renders one native `<textarea>` with class
`ghost-textarea`, `data-part="root"`, optional `data-state` (`disabled`,
`readonly`, or `invalid`), and `data-auto-resize` when auto-resize is on.

```css
.ghost-textarea[aria-invalid='true'] {
  /* Invalid chrome. Prefer aria-invalid so it still applies when readonly. */
}
```

## Accessibility and environment behavior

The root is a native textarea. Keyboard behavior is platform-native:
printable keys insert text, `Enter` inserts a newline, `Tab` leaves the
field. Disabled fields are not in sequential tab order; readonly fields are.

SSR markup is deterministic from props and the current value. Auto-resize
does not read browser globals during setup.

See the [GhostTextarea specification](./textarea-spec.md) for the complete
behavior and compatibility contract.
