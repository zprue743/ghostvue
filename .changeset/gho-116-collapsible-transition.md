---
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

Fix themed GhostCollapsible height transitions: animate `grid-template-rows`, defer `hidden` on close until the transition ends, and honor reduced motion and `disableAnimation`.