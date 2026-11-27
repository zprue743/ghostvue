---
'@ghostvue/themes': minor
---

Add an opt-in way to ship only the theme CSS an app uses.
`@ghostvue/themes/components` exports the same themed components as
`@ghostvue/themes` without importing `default.css`. Pair it with one palette
(`calm.css`, `vibrant.css`, `mono.css`, or `tokens.css`), the new
`@ghostvue/themes/base.css` (shared wrapper scope and semantic recipes), and the
new per-component `@ghostvue/themes/recipes/<family>.css` files. The
`@ghostvue/themes` entry and `default.css` load and style exactly as before.
