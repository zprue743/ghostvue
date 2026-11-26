# Packed consumer fixtures

Source for `scripts/consumer-packed-smoke.mjs` (`pnpm consumer:packed`). Each
directory is copied into a scratch project outside the monorepo, given a
`package.json` that installs the packed `@ghostvue/*` tarballs with npm, and
exercised as an external consumer would. These files are not part of the
workspace build, lint, or typecheck; the consumer's own tools check them.

- `vite-app/`: Vite + Vue app using themed Field, Input, Select, Dialog, Drawer,
  and Toast from `@ghostvue/themes`. The production bundle is mounted in jsdom
  by `mount.mjs`.
- `nuxt-app/`: Nuxt app that relies only on `@ghostvue/nuxt` auto-imports.
- `eslint/`: flat config with `@ghostvue/eslint-plugin` and one valid and one
  invalid SFC.
