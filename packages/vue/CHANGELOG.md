# @ghostvue/vue

## 0.1.0

### Minor Changes

- a6f527b: Initial public release of GhostVue: a Vue 3, headless-first component library
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

- 2117dff: Add `GhostScrollSpy` section-navigation compound parts, `useGhostScrollSpy`, and scroll measurement helpers. The docs landing rail migrates onto the new primitive without visual changes.

  ScrollSpy preserves consumer classes and link metadata, tracks each enabled section once, and updates after viewport or content resizes. Nested navigation respects scroll padding and target scroll margins.

  Tracking follows changes to the scroll container, including template refs that resolve after mount. Progress stays at zero when no targets can be measured.

  Enabled custom link components receive the resolved `href`.

  Link activation and `scrollTo()` jump immediately when reduced motion is requested, even with CSS smooth scrolling.

  Changes to `probeOffset` or `endThreshold` refresh the active section and its progress at the current scroll position.

  Consecutive scroll measurements request the same controlled selection change only once while the current value stays the same. Adding or removing a target section refreshes tracking even when the scroll container does not resize.

- 28b4d28: Add a themed single-sort GhostDataTable with native table semantics, size and surface settings, sticky headers, and accessible selection and busy states. GhostDataTablePreset also supports opt-in toolbar, bulk-action, and pagination slots while retaining existing column cell slots.

### Patch Changes

- 67fb75d: Replace placeholder prop and slot descriptions in the `./manifest.json` component manifests for GhostAvatar, GhostCombobox, GhostDataTable, GhostFieldLabel, GhostLink, GhostNumberInput, GhostPagination, GhostRadioGroup, GhostRadioGroupItem, GhostSelect, and GhostSlider with the descriptions their docs pages already used. The docs pages now generate their API tables from these manifests.
- 2897719: Declare third-party runtime dependencies with caret ranges instead of exact versions, so apps can dedupe them and take patch releases: `@floating-ui/dom` `^1.8.0` and `@internationalized/date` `^3.12.4` in `@ghostvue/vue`; `@modelcontextprotocol/sdk` `^1.32.2`, `ajv` `^8.20.0` and `zod` `^4.6.7` in `@ghostvue/mcp`. `@ghostvue/vue` also declares `unplugin-vue-components` `^32.0.0` as an optional peer for `@ghostvue/vue/resolver`; it is not installed unless you add it.
- da68ec0: Clean up published package contents. `@ghostvue/themes` no longer ships
  compiled test files. `@ghostvue/themes`, `@ghostvue/nuxt`,
  `@ghostvue/eslint-plugin`, and `@ghostvue/mcp` no longer ship `.js.map` or
  `.d.ts.map` files, which pointed at `src/` files the packages do not include.
  `@ghostvue/vue`, `@ghostvue/themes`, `@ghostvue/nuxt`, and
  `@ghostvue/eslint-plugin` now include a README.
