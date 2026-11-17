---
'@ghostvue/vue': patch
---

Lock the effective viewport scroller (`document.documentElement` when root owns overflow per CSS Overflow 3, otherwise `document.body`) in `useScrollLock` and restore all modified inline properties and `!important` priorities on final release.
