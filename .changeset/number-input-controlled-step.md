---
'@ghostvue/vue': patch
---

Keep a controlled `GhostNumberInput` authoritative after stepping: when the parent rejects an increment, decrement, or keyboard step, the visible field and the hidden form input now reconcile to `modelValue` after the parent flush instead of keeping the proposed value.
