---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

`GhostSelectTrigger` keeps `GhostFieldControl` state spread onto it. The
trigger used to overwrite the field's `aria-invalid` with the root's own
`invalid` flag, so an invalid `GhostField` left the combobox unmarked, and it
rendered the field's `invalid` and `required` keys as attributes on the button.
It now combines the field and root state into `aria-invalid` and
`aria-required` and drops the raw keys.

`Enter` now opens a closed `GhostSelectTrigger` rendered as a native button.
The keydown opened the list, then the click the browser synthesizes for Enter
closed it again in the same task. The trigger now cancels the key's default
for every host.

Opening a select from the keyboard now moves focus into the list in browsers.
The trigger focused the selected (or first or last enabled) option before the
content was positioned, while it was still `visibility: hidden`, so the focus
call was ignored, focus stayed on the trigger, and arrow keys could not reach
the options. `GhostSelectContent` now applies the same rule as its initial
focus once the list is visible.

The trigger's `aria-controls` now names the `role="listbox"` element (whose new
id is the content id plus `-listbox`) instead of the presentational content
wrapper, as the specification states. With a trigger labelled by a
`GhostField` label, the open list previously failed axe's
`aria-input-field-name` rule.

Themed `GhostSelect` gains complete visual states: the value ends a long label
with an ellipsis and a placeholder is muted, keyboard focus uses the token
focus ring instead of the browser outline, hover recolors the border without
shifting the control, `aria-invalid` gets the danger border, a disabled trigger
uses the disabled action tokens, and hovered options get a muted fill. Long
option labels wrap and the list is capped to the viewport width.
