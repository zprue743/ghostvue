---
'@slop-ui/themes': minor
'@slop-ui/core': minor
---

Compile DTCG tokens in `@slop-ui/themes` to semantic `--sl-*` CSS variables,
typed TypeScript constants, and a JSON catalog. SlButton theme CSS consumes
those tokens. Light and dark switch through nested `data-sl-mode`;
`data-color-scheme` is replaced. Component manifests record `--sl-*`
properties.
