---
'@ghostvue/vue': patch
---

Model native `<input type="radio">` group Tab stops in `getTabbableElements` (checked tabbable radio, all-unchecked and disabled/hidden fallbacks, form-ownership and `name` grouping) and `useFocusScope` Tab/Shift+Tab wrapping, memoize per-query ancestor visibility checks, and document the open-shadow-root query boundary.
