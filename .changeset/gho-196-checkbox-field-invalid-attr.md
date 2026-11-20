---
'@ghostvue/vue': patch
---

`GhostCheckbox` no longer renders an `invalid` attribute when
`GhostFieldControl` slot props are spread onto it. The slot's raw `invalid`
flag is not an HTML attribute, so every checkbox inside a `GhostField` used to
render `invalid="false"` (or `invalid="true"`). The checkbox now drops that one
key; the field's `aria-invalid`, `aria-describedby`, `id`, `required`, and
`disabled` still apply, and other native attributes, classes, styles, and
listeners fall through and merge as before.
