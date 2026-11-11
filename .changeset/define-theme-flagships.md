---
'@slop-ui/themes': minor
---

Add Node-only `defineTheme` (`@slop-ui/themes/define`) and compiled flagship
themes `calm`, `vibrant`, and `mono`. Token CSS no longer treats
`.slop-themed-scope` as a token host, so nested `data-sl-theme` inherits into
themed wrappers.
