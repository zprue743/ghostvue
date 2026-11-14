---
'@ghostvue/vue': patch
---

Fix `GhostFieldError` SSR markup so non-empty error slots render visibly with `role="alert"`; `aria-invalid` is set on the control during SSR. `aria-describedby` wiring for the error id still happens after hydration (unchanged client registration). Empty error slots remain hidden.
