---
'@ghostvue/themes': patch
---

Fix theme CSS audit defects across `GhostInlineAlert`, `GhostNumberInput`, `GhostField`, `GhostRadioGroup`, and `GhostDialog`:

- `ghost-inline-alert`: apply the solid-variant contrast foreground token to the alert root, title, and message, scope part selectors with child combinators, and force `CanvasText` on title/message in `forced-colors: active`.
- `ghost-number-input`: scale stepper buttons alongside the input for `sm`/`lg` sizes, scope part selectors with child combinators, and replace `outline: none` focus rings with `outline` plus `forced-colors: active` `Highlight` support.
- `ghost-field`: scope label, required-indicator, description, and error selectors with child combinators so nested controls do not inherit outer field part styles.
- `ghost-radio-group`: wire `sm`/`lg` hit-target sizing to `--_ghost-radio-hit` and add `@media (forced-colors: active)` styling for the ring, checked dot, disabled state, and focus outline.
- `ghost-dialog`: scope title and description selectors to direct children or dialog-owned part classes so nested `GhostFieldDescription` or `GhostInlineAlert` parts are not styled as dialog parts.
