---
'@ghostvue/vue': patch
---

`GhostSelect` and `GhostCombobox` no longer clear an uncontrolled selection when
the selected option unmounts. Filtering, async result replacement, reordering,
and remounting options keep single and multiple values, their form submission,
and their last known labels without emitting `update:modelValue`. Explicit user
clearing, native form reset, and controlled values behave as before.
