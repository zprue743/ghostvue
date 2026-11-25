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

## Retheme without rewrites

`defineTheme` compiles a brand colour into independently tuned light and dark
OKLCH ramps and verifies WCAG 2 AA contrast at build time. Theme styles live in
`@layer ghostvue-theme` behind `:where()` selectors, so your application CSS
always wins, and `@ghostvue/vue` has no dependency on `@ghostvue/themes`. See
[Flagships and defineTheme](/themes/define-theme).

## Component catalog

Browse every documented `Ghost*` component in [Components](/components/) or
follow the [Getting started](/getting-started) guide to try GhostVue locally.
For upcoming components and composable exports, see the
[component roadmap](/roadmap).

## Built for agents and tooling

- **Component manifests:** every component ships a JSON
  [manifest](/architecture/component-manifest) of its props, models, events,
  slots, parts, and accessibility contract.
- **MCP server:** [`@ghostvue/mcp`](/tooling/mcp-server) is a local, read-only
  server that lets coding agents list components and fetch manifests, example
  source, docs, and tokens.
- **ESLint plugin:** [`@ghostvue/eslint-plugin`](/tooling/eslint-plugin) checks
  props, slots, and `v-model` bindings in templates against the manifests.
- **Nuxt auto-imports:** [`@ghostvue/nuxt`](/auto-imports) auto-imports the
  headless layer; themed components and CSS are opt-in.

> [!WARNING]
> **Pre-release:** GhostVue is under active development and packages are not on
> npm yet. Try it in the repository playground via
> [Getting started](/getting-started), or see
> [Contributing](/contributing/workflow) if you want to help build components.
