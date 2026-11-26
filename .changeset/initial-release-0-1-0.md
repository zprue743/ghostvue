---
'@ghostvue/vue': minor
'@ghostvue/themes': minor
'@ghostvue/nuxt': minor
'@ghostvue/eslint-plugin': minor
'@ghostvue/mcp': minor
---

Initial public release of GhostVue: a Vue 3, headless-first component library
with an optional theme layer, a Nuxt module, an ESLint plugin, and an MCP
server for coding agents. The component packages need Vue `^3.5.0`;
`@ghostvue/mcp` needs Node `>=22`. The five packages share one version and
move together. `@ghostvue/themes` and `@ghostvue/nuxt` declare `@ghostvue/vue`
(and Nuxt also `@ghostvue/themes`) as caret-ranged peer dependencies, so install
`@ghostvue/vue` alongside them and keep a single copy in your app.

- `@ghostvue/vue`: unstyled, accessible `Ghost*` components and `useGhost*`
  composables, including Button, Field, Input, Textarea, Number Input,
  Checkbox, Switch, Radio Group, Select, Combobox, Slider, Date Picker,
  Calendar, File Upload, Dialog, Drawer, Popover, Hover Card, Tooltip, Toast,
  Dropdown Menu, Context Menu, Menubar, Command Palette, Tabs, Accordion,
  Collapsible, Tree, Table, Data Table, Pagination, Breadcrumb, Toolbar, Toggle
  Group, Segmented Control, and layout and feedback primitives. Ships a
  `@ghostvue/vue/resolver` for `unplugin-vue-components` and a
  `@ghostvue/vue/manifest.json` collection of machine-readable component
  contracts.
- `@ghostvue/themes`: themed wrappers for most of the components above, design tokens
  (`tokens.css`, `tokens.json`), the `default`, `calm`, `vibrant`, and `mono`
  themes in the `ghostvue-theme` cascade layer, and Node-only `defineTheme`
  (`@ghostvue/themes/define`) for custom themes.
- `@ghostvue/nuxt`: Nuxt `^4.6.0` module that auto-imports headless components
  and composables by default, with opt-in themed wrappers and theme CSS.
- `@ghostvue/eslint-plugin`: `no-unknown-props`, `no-unknown-slots`, and
  `no-undeclared-v-model` rules that check `Ghost*` template usage against the
  component manifests, enabled together by `configs.recommended`.
- `@ghostvue/mcp`: read-only, offline Model Context Protocol stdio server
  (`ghostvue-mcp`) with `list_components`, `get_component`, `get_examples`,
  `search_docs`, and `get_tokens`. Responses carry a `manifestSchemaId` stamp
  that names the hosted schema
  `https://ghostvue.dev/schemas/v1/manifest.schema.json`.
