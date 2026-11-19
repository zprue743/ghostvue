---
'@ghostvue/themes': patch
---

Themed `GhostDialogContent` now stays centered in right-to-left documents. The
surface used `inset-inline-start: 50%` with a physical `translate(-50%, -50%)`,
so under `dir="rtl"` it was pushed past the left edge of the viewport. It now
centers with physical `left` and `top` offsets in both directions.
