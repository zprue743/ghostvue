---
'@ghostvue/vue': patch
---

Fix `GhostNumberInput` keyboard handling so Home and End only jump to `min` / `max` when those bounds are set; otherwise the keys move the caret like a normal text field.