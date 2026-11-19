---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

`GhostComboboxInput` keeps `GhostFieldControl` state spread onto it. The input
used to overwrite the field's `aria-invalid` with the root's own `invalid`
flag, so an invalid `GhostField` left the combobox unmarked, and it rendered
the field's `invalid` key as an attribute. It now combines the field and root
state into `aria-invalid` and `aria-required` and drops the raw `invalid` key.

A controlled `GhostCombobox` now clears when the parent sets `modelValue` back
to `undefined` (for example `v-model` cleared by an Unassign button). It used
to fall back to its stale uncontrolled value, so the old option stayed
selected, kept submitting, and kept its label in the input.

A `placeholder` set on `GhostComboboxInput` now renders. The input replaced it
with the root's `placeholder` prop even when that prop was unset; the root
prop still wins when both are set.

The input's and `GhostComboboxTrigger`'s `aria-controls` now name the
`role="listbox"` element (whose new id is the content id plus `-listbox`)
instead of the presentational content wrapper, as the specification states.

An open, empty combobox list now passes axe's `aria-required-children` rule.
`GhostComboboxEmpty` had `role="status"` inside the `role="listbox"` element,
which may own only options and groups, and the empty listbox itself had no
options. `GhostComboboxEmpty` no longer has a role, and while the list is open,
not loading, and has no registered options, the popup element drops
`role="listbox"` and `aria-labelledby` (it keeps its id, so `aria-controls`
still names it). The root's polite live region still announces the empty
result (`messages.empty`). While loading, the listbox keeps its role with
`aria-busy`.

Themed `GhostCombobox` gains complete input states: a muted placeholder, a
stronger border on hover that never shifts the control, the token focus ring
for keyboard focus (a focused, closed input previously showed the browser
outline), a danger border with `aria-invalid`, and the disabled action tokens.
The list is capped to the viewport width and long option text wraps.
