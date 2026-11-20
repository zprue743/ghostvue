---
layout: GhostLanding
sidebar: false
---

# Vue-first, headless-first UI.

Unstyled, accessible Vue 3 primitives in `@ghostvue/vue`. Optional,
contrast-tested OKLCH themes in `@ghostvue/themes`.

## Adopt headless or themed

Start with `@ghostvue/themes` for styled components and `variant`, `tone`, and
`size` props, or import directly from `@ghostvue/vue` to bring your own design
system. Both packages export the same component names and accessibility
behavior, so you can mix or switch layers component by component.

## Progressive escape hatches

Simple use should look simple; consumers meet complexity only when their interface
requires it. Configuration describes intent—not the library's nested DOM.

## Built for real apps

- **Zero style lock-in:** `@ghostvue/vue` has no dependency on `@ghostvue/themes`.
  Theme styles live in `@layer ghostvue-theme` with `:where()` selectors so your
  application CSS always wins.
- **Contrast-checked themes:** `defineTheme` compiles DTCG seeds into
  independently tuned light and dark OKLCH ramps and verifies WCAG 2 AA
  contrast at build time.
- **Typed, tested, and tool-ready:** Every `Ghost*` component ships with
  TypeScript types, SSR support, keyboard and axe-core tests, Nuxt auto-imports,
  and ESLint template validation.

## Component catalog

Browse every documented `Ghost*` component in [Components](/components/) or
follow the [Getting started](/getting-started) guide to try GhostVue locally.
For upcoming components and composable exports, see the
[component roadmap](/roadmap).

> [!WARNING]
> **Pre-release:** GhostVue is under active development and packages are not on
> npm yet. Try it in the repository playground via
> [Getting started](/getting-started), or see
> [Contributing](/contributing/workflow) if you want to help build components.
