---
'@ghostvue/themes': patch
---

Bundle the Node-only `@ghostvue/themes/define` entry for packed installs: ship
`dist/tokens` template JSON and a self-contained `dist/define.js` so consumers
can call `defineTheme` without workspace-only `scripts/` paths.
