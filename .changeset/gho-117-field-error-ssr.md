---
'@ghostvue/vue': patch
---

Fix `GhostFieldError` SSR markup so non-empty error slots render with `role="alert"` and wire `aria-describedby` / `aria-invalid` on the first server paint. Empty error slots remain hidden.