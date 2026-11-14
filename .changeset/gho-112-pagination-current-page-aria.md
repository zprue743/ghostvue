---
'@ghostvue/vue': patch
---

Stop setting `aria-disabled` on the current pagination page button so assistive
tech does not announce the active page as dimmed. Edge controls that cannot
navigate still use `aria-disabled`.
