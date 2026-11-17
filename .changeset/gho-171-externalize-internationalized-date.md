---
'@ghostvue/vue': patch
---

Externalize `@internationalized/date` in `@ghostvue/vue`'s Vite library build so re-exported `CalendarDate` and `parseDate` preserve upstream class identity and `instanceof` checks across consumer bundles, and unused calendar code can tree-shake.
