# GhostCheckbox

`GhostCheckbox` is an unstyled native checkbox with a boolean v-model and a
consumer-owned mixed state. Import it from `@ghostvue/vue` for headless use, or
from `@ghostvue/themes` for the default visual treatment.

## Basic use

<GhostExample id="checkbox/basic" />

Wrap the control in a `<label>` or associate one with `for`/`id`. Native `id`,
`name`, `value`, `form`, and `aria-*` attributes fall through. There is no
label slot; Field (GHO-71) is not required.

Headless use of the same contract without the SFC:

<GhostExample id="checkbox/composable" />

## API

| Prop            | Type      | Default     | Description                                                                                         |
| --------------- | --------- | ----------- | --------------------------------------------------------------------------------------------------- |
| `modelValue`    | `boolean` | `undefined` | Controlled checked state. Omit it for uncontrolled use. Mixed is not a third model value.           |
| `defaultValue`  | `boolean` | `false`     | Initial checked state when `modelValue` is omitted. Later changes are ignored.                      |
| `indeterminate` | `boolean` | `false`     | Mixed state. Applied through the DOM `indeterminate` property. Consumer-owned; not part of v-model. |
| `disabled`      | `boolean` | `false`     | Native disabled: no activation, no sequential focus, excluded from submit.                          |

`v-model` emits `update:modelValue` with a boolean after native activation.
`type` is always `"checkbox"`. `checked` is not a public prop; the model owns
that state.

All other native input attributes and event listeners fall through to the root
`<input>`. The component does not generate an `id`; pass one as a native
attribute when a `for` association needs it.

## Themed use

<GhostExample id="checkbox/themed" />

Importing the themed component loads the default stylesheet. Visual props exist
only on this wrapper:

| Prop   | Type                                | Default    | Description            |
| ------ | ----------------------------------- | ---------- | ---------------------- |
| `size` | `'sm' \| 'md' \| 'lg'`              | `'md'`     | Control size.          |
| `tone` | `'accent' \| 'neutral' \| 'danger'` | `'accent'` | Semantic color intent. |

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

See the [GhostCheckbox specification](./checkbox-spec.md) for the complete
behavior and compatibility contract.
