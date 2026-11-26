# GhostCheckbox

`GhostCheckbox` is an unstyled native checkbox with a boolean v-model and a
consumer-owned mixed state. Import it from `@ghostvue/vue` for headless use, or
from `@ghostvue/themes` for the default visual treatment.

<GhostExample id="checkbox/notification-preferences" />

The preferences panel composes themed `GhostCheckbox` with
[`GhostField`](./field.md): each option's label points at its checkbox with
`for`, and its description is linked through `aria-describedby`, so screen
readers announce "Weekly digest, checkbox, not checked" followed by the hint.
The checkbox keeps its full hit target in the first column, and the label's
first line is centered on the painted box, so long labels and descriptions wrap
under the text instead of under the control.

**All project activity** is a select-all. It is `checked` when every child is
on, `indeterminate` when only some are, and toggling it sets every child; the
v-model stays boolean. **Security alerts** sits in a `disabled` field, which
disables the checkbox and mutes its label: it stays visible so members know the
alert exists, but they cannot turn it off. Disabled checkboxes are left out of
form submission, so the seeded form posts `mentions` and `assignments` but not
`security`. On narrow previews the actions stack at full
width.

## Basic use

<GhostExample id="checkbox/basic" />

Wrap the control in a `<label>` or associate one with `for`/`id`. Native `id`,
`name`, `value`, `form`, and `aria-*` attributes fall through. There is no
label slot; Field (GHO-71) is not required.

Headless use of the same contract without the SFC:

<GhostExample id="checkbox/composable" />

## API

<!-- @generated docs-api:vue/ghost-checkbox begin -->

<!-- Source: packages/vue/manifests/ghost-checkbox.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop            | Type      | Default | Description                                                                                                                                                      |
| --------------- | --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `defaultValue`  | `boolean` | `false` | Initial checked state when modelValue is omitted. Later changes are ignored.                                                                                     |
| `disabled`      | `boolean` | `false` | Native disabled semantics: no activation, no sequential focus, and excluded from form submission.                                                                |
| `indeterminate` | `boolean` | `false` | Mixed state for select-all and similar. Applied through the DOM indeterminate property. Consumer-owned; not part of the v-model.                                 |
| `modelValue`    | `boolean` | —       | Controlled checked state. Omit it for uncontrolled use. undefined is uncontrolled; false is unchecked. Mixed is the indeterminate prop, not a third model value. |

<!-- @generated docs-api:vue/ghost-checkbox end -->

`v-model` emits `update:modelValue` with a boolean after native activation.
`type` is always `"checkbox"`. `checked` is not a public prop; the model owns
that state.

All other native input attributes and event listeners fall through to the root
`<input>`. The component does not generate an `id`; pass one as a native
attribute when a `for` association needs it.

## Themed use

<GhostExample id="checkbox/themed" />

The themed sample shows every state side by side, then each tone and size.
Mixed clears on the first click, the way a resolved select-all would.

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

<!-- @generated docs-api:themes/ghost-checkbox begin -->

<!-- Source: packages/themes/manifests/ghost-checkbox.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostCheckbox` API, which it forwards:

| Prop   | Type                                | Default    | Description                                                                      |
| ------ | ----------------------------------- | ---------- | -------------------------------------------------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'`              | `"md"`     | Control size. The default omits data-size so CSS can treat a missing hook as md. |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `"accent"` | Semantic color intent. The default omits data-tone.                              |

<!-- @generated docs-api:themes/ghost-checkbox end -->

The hit target uses `--ghost-control-size-*-min`. The painted box uses
`--ghost-action-icon-size`. Corners use `--ghost-radius-sm`. Color comes from
`--ghost-action-*-*` by tone.
You can also import the stylesheet and wrap unstyled checkboxes in
`.ghost-theme` when you want a region of headless components to pick up the
defaults. See the [default theme guide](../themes/default.md).

## Mixed (select-all)

Mixed is a display state the parent computes. The v-model stays boolean.
Typical select-all: `indeterminate` when some children are selected,
`modelValue` true only when all are selected. Clicking mixed follows native
HTML (usually becomes checked).

<GhostExample id="checkbox/indeterminate" />

Do not fold mixed into `modelValue`. DataTable-specific selection
orchestration is out of scope for this component.

## Field composition

Spread `GhostFieldControl` slot props onto the checkbox to receive the field's
generated `id`, `aria-describedby`, `aria-invalid`, `disabled`, and `required`.
The slot's raw `invalid` flag is not an HTML attribute, so the checkbox drops
it; `aria-invalid` carries that state. Every other attribute still falls
through.

## Unlabeled and form use

Row-selection checkboxes often have no visible text. Name them with
`aria-label` or `aria-labelledby`. Give form checkboxes a `name` so they
participate in native submission; mixed is never submitted, only `checked`.

## Component refs

<GhostExample id="checkbox/ref" />

The ref exposes `element`, `focus(options?)`, and `blur()`. Before mount and
after unmount, `element` is `null` and the methods are safe no-ops.

## Styling

The unstyled component renders one native `<input type="checkbox">` with class
`ghost-checkbox`, `data-part="root"`, `data-state="checked"` while checked and
not mixed, and `data-state="indeterminate"` while mixed. Unchecked omits
`data-state`. Native `disabled` is the unavailable hook.

```css
.ghost-checkbox[data-state='indeterminate'] {
  /* Applies only while mixed. */
}
```

## Accessibility and environment behavior

Enabled checkboxes retain native `Space` toggle, pointer, touch, and focus
behavior. `Enter` does not toggle; in a form it submits. Disabled checkboxes
use native disabled semantics. The component never sets `role` or
`aria-checked`: native `checked` and `indeterminate` already expose those
states, and `aria-checked` on a native checkbox is ignored.

SSR markup is deterministic from props for checked and disabled. Mixed cannot
be an HTML attribute; SSR still sets `data-state="indeterminate"`, and the
DOM property is written after mount.

See the [GhostCheckbox specification](/specs/checkbox) for the complete
behavior and compatibility contract.
