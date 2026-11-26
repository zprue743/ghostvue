# GhostSwitch

`GhostSwitch` is an unstyled on/off control with `role="switch"`, Vue
`v-model`, and native form participation. Import it from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for the default track-and-thumb
treatment.

<GhostExample id="switch/workspace-security" />

The security settings card pairs themed `GhostSwitch` with `GhostField` rows
so each label and description aligns beside its switch and the locked policy
row stays disabled.

## Basic use

<GhostExample id="switch/basic" />

The root is a native `<button type="button" role="switch">`. Space and Enter
both toggle, because native button activation fires for both keys. APG lists
Space as required and Enter as optional; this host implements the optional
key.

`GhostField` is not available yet. Name the control with a `<label for>`
pointing at a passed `id`, or with `aria-label` / `aria-labelledby`. Do not
put "On" / "Off" in the accessible name; the name must stay stable while
`aria-checked` changes.

Headless use of the same contract without the SFC:

<GhostExample id="switch/composable" />

## API

<!-- @generated docs-api:vue/ghost-switch begin -->

<!-- Source: packages/vue/manifests/ghost-switch.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop           | Type      | Default | Description                                                                        |
| -------------- | --------- | ------- | ---------------------------------------------------------------------------------- |
| `defaultValue` | `boolean` | `false` | Initial on/off when modelValue is omitted. Form reset restores this mounted value. |
| `disabled`     | `boolean` | `false` | Native disabled: not focusable, not operable, and not submitted.                   |
| `form`         | `string`  | —       | Associates the hidden input with an external form id.                              |
| `modelValue`   | `boolean` | —       | Controlled on/off. Omit for uncontrolled mode.                                     |
| `name`         | `string`  | —       | Form field name. Submits name=value while on and enabled.                          |
| `readonly`     | `boolean` | `false` | Focusable and submitted, but not user-operable. Expressed as aria-readonly.        |
| `value`        | `string`  | `"on"`  | Submitted string when on. Same default as a native checkbox.                       |

| Slot      | Slot props | Description                                                                                                                                                         |
| --------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `default` | —          | Optional inner content, usually a visible name. Prefer a label for=id or aria-label when the name should not sit inside the control. Do not put On/Off in the name. |

<!-- @generated docs-api:vue/ghost-switch end -->

`v-model` is a boolean. Native attributes and listeners fall through to the
button, except `name`, `value`, and `form`, which route to the hidden form
input. The default slot is optional inner content. The component does not
generate an `id`.

The host is a `button`, not `input[type="checkbox"]`. A checkbox cannot
implement `readonly` natively, Enter would submit a form instead of
toggling, and sharing that host with `GhostCheckbox` would create the
shared abstraction GHO-31 forbids. Form submit uses a `type="hidden"`
input so the switch stays the only labelable element.

## Themed use

<GhostExample id="switch/themed" />

Importing the themed component loads the default stylesheet. Visual props
exist only on this wrapper:

<!-- @generated docs-api:themes/ghost-switch begin -->

<!-- Source: packages/themes/manifests/ghost-switch.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostSwitch` API, which it forwards:

| Prop   | Type                                | Default    | Description                                                                      |
| ------ | ----------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'`              | `"md"`     | Control size. The default omits data-size so CSS can treat a missing hook as md. |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `"accent"` | Semantic color of the on track. The default omits data-tone.                     |

<!-- @generated docs-api:themes/ghost-switch end -->

Themed track size comes from `--ghost-control-size-*-min`. The on fill uses
`--ghost-action-primary-*` (or the matching tone) and
`--ghost-gradient-action-*`. Off uses `--ghost-border-default`. There are
no per-component tokens.

You can also import the stylesheet and wrap unstyled switches in
`.ghost-theme` when you want a region of headless components to pick up the
defaults. See the [default theme guide](../themes/default.md).

## Disabled and read-only

<GhostExample id="switch/states" />

Disabled uses native `disabled`: the switch leaves the tab order, ignores
activation, and is omitted from `FormData`. Read-only stays focusable, sets
`aria-readonly="true"`, ignores user activation, and still submits.
Programmatic `v-model` writes apply in both states. When both flags are set,
native disabled wins.

## Form participation

<GhostExample id="switch/form" />

A named switch contributes `name=value` while it is on and enabled, and
contributes nothing while off, matching a native checkbox. `form.reset()`
restores the mounted `defaultValue` (or `false`). Controlled parents that
keep `v-model` in sync with `update:modelValue` reset as well.

## Component refs

<GhostExample id="switch/ref" />

The ref exposes `element`, `checked`, `toggle()`, `focus(options?)`, and
`blur()`. Before mount and after unmount, `element` is `null` and the
methods are safe no-ops. `toggle()` is the user-activation path and is a
no-op while disabled or readonly.

## Styling

The unstyled component renders a `<button>` with class `ghost-switch`,
`data-part="root"`, and `data-state="checked"` or `data-state="unchecked"`.
The decorative track and thumb are `data-part="track"` and
`data-part="thumb"`. There is no layout wrapper to target on the unstyled
root (the hidden input is not a styling surface).

```css
.ghost-switch[data-state='checked'] {
  /* Applies only while the switch is on. */
}
```

## Accessibility and environment behavior

Enabled switches retain native `Enter`, `Space`, pointer, touch, and focus
behavior. Disabled switches use native disabled semantics. Read-only
switches remain focusable while activation is suppressed. Without the
themed wrapper, you own visible focus indication, sufficient contrast, and
an adequate touch target.

SSR markup is deterministic from props and slot content. The form-reset
listener is registered after mount. No other listeners, timers, or
observers require cleanup.

See the [GhostSwitch specification](/specs/switch) for the complete
behavior and compatibility contract, including the host-element decision.
