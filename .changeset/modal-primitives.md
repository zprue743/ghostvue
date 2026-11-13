---
'@ghostvue/vue': patch
---

Add internal modal overlay primitives (`useScrollLock` and `useInertOthers`) and coordinate `useFocusScope` with `useDismissableLayer` so trapped scopes ignore `Tab` when focus is inside an upper dismissable layer (such as a portaled popover opened inside a modal).
