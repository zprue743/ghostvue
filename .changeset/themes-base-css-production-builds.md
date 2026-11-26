---
'@ghostvue/themes': patch
---

Keep the base stylesheet in production builds. The package entry
(`dist/index.js`) is now listed in `sideEffects`, so Vite and other bundlers no
longer tree-shake its `import './default.css'` when an app only uses themed
components. Importing from `@ghostvue/themes` loads the base styles without a
separate `@ghostvue/themes/default.css` import, as documented.
