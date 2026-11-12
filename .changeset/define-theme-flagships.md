---
'@ghostvue/themes': minor
---

Add Node-only `defineTheme` (`@ghostvue/themes/define`) and compiled flagship
themes `calm`, `vibrant`, and `mono`. Token CSS no longer treats
`.ghost-themed-scope` as a token host, so nested `data-ghost-theme` inherits into
themed wrappers.
