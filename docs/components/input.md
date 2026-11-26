# GhostInput

`GhostInput` is an unstyled native single-line text control with a string
`v-model` and first-class disabled, readonly, invalid, and required states.
Import it from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for
the default visual treatment.

<GhostExample id="input/account-details" />

The account form composes themed `GhostInput` with
[`GhostField`](./field.md) for labels, hints, and errors. The work email
validates as you type: `invalid` on the field sets `aria-invalid` on the input
and links the error through `aria-describedby`. The workspace URL is
`readonly`, so it stays focusable and is submitted. The billing contact is
`disabled`. Long values stay on one line and end with an ellipsis at rest;
long hints and errors wrap. The form keeps a 28rem maximum width and the
name row stacks when it gets narrow.

## Basic use

<GhostExample id="input/basic" />

The root is always a native `<input>`. Pair it with a real `<label>` (or
`aria-label` / `aria-labelledby`). Placeholder text is not a name.
`GhostField` is not required; pass `id` and `aria-*` as ordinary attributes
so a future Field can wire the same control.

Headless use of the same contract without the SFC:

<GhostExample id="input/composable" />

## API

<!-- @generated docs-api:vue/ghost-input begin -->

<!-- Source: packages/vue/manifests/ghost-input.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type             | Default  | Description                                                                                                          |
| -------------- | ---------------- | -------- | -------------------------------------------------------------------------------------------------------------------- |
| `defaultValue` | `string`         | `""`     | Initial uncontrolled value. Later changes are ignored. Also the form-reset seed.                                     |
| `disabled`     | `boolean`        | `false`  | Applies native disabled semantics, prevents editing and sequential focus, and omits the field from form submit.      |
| `invalid`      | `boolean`        | `false`  | Consumer-owned validity. Sets aria-invalid and data-state=invalid. Does not mirror native ValidityState.             |
| `modelValue`   | `string`         | —        | Controlled value. Omit for uncontrolled mode. An empty string is a real controlled value, not unset.                 |
| `readonly`     | `boolean`        | `false`  | Applies native readonly semantics. The field stays focusable and is submitted, but cannot be edited.                 |
| `required`     | `boolean`        | `false`  | Applies the native required constraint.                                                                              |
| `type`         | `GhostInputType` | `"text"` | Native text-like type (text, search, email, password, tel, url). Checkbox, radio, file, and number are out of scope. |

<!-- @generated docs-api:vue/ghost-input end -->

`v-model` emits `update:modelValue` on the native `input` event, matching Vue
on a plain `<input>`. Native listeners such as `@change` and `@blur` still
attach to the element. Do not pass a native `value` attribute for the current
text.

The component does not generate an `id`. There is no content slot.

## Themed use

<GhostExample id="input/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

<!-- @generated docs-api:themes/ghost-input begin -->

<!-- Source: packages/themes/manifests/ghost-input.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostInput` API, which it forwards:

| Prop    | Type                   | Default | Description                                                                      |
| ------- | ---------------------- | ------- | -------------------------------------------------------------------------------- |
| `size`  | `'sm' \| 'md' \| 'lg'` | `"md"`  | Control size. The default omits data-size so CSS can treat a missing hook as md. |
| `block` | `boolean`              | `false` | Stretch to the available inline size via data-block.                             |

<!-- @generated docs-api:themes/ghost-input end -->

Themed size, padding, radius, and type come from density and control tokens.
Comfortable `md` is 40px tall with an 8px radius at `--ghost-roundness: 1`.
See [density, type, and roundness](../themes/density.md). There are no
per-component tokens.

You can also import the stylesheet and wrap unstyled inputs in `.ghost-theme`
when you want a region of headless components to pick up the defaults. See the
[default theme guide](../themes/default.md).

## Disabled, readonly, invalid, and required

<GhostExample id="input/states" />

Each state is set on `GhostField`, which forwards `disabled`, `invalid`, and
`required` to the input; `readonly` goes on the input directly. Without a field,
pass the same props to `GhostInput`.

Disabled uses the native `disabled` attribute. Readonly uses native `readonly`.
Required uses native `required`. Invalid is a consumer flag for custom or async
errors; native constraint validation still runs on submit for `required` /
`pattern` / `maxlength`.

## Search

`type="search"` keeps native search behavior for DataTable-style filters. This
sample filters a local list of reports and announces the match count:

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

See the [GhostInput specification](/specs/input) for the complete behavior
and compatibility contract.
