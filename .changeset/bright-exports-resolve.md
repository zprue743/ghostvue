---
'@ghostvue/shared': patch
'@ghostvue/core': patch
'@ghostvue/vue': patch
'@ghostvue/themes': patch
---

Expose top-level type declarations for legacy TypeScript resolution and make Vue
and theme declarations resolve under Node ESM. Preserve the theme define subpath
for legacy type resolution.
