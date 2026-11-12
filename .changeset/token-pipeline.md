---
'@ghostvue/themes': minor
'@ghostvue/core': minor
---

Compile DTCG tokens in `@ghostvue/themes` to semantic `--ghost-*` CSS variables,
typed TypeScript constants, and a JSON catalog. GhostButton theme CSS consumes
those tokens. Light and dark switch through nested `data-ghost-mode`;
`data-color-scheme` is replaced. Component manifests record `--ghost-*`
properties.
