# @ghostvue/themes

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

- 85e0a0d: Add `appearance="button"` and `size` to themed `GhostLink` so navigation links
  can render with the `GhostButton` visual recipe (`variant`, `tone`, and `size`)
  while preserving real anchor semantics, `disabled` behavior, and `target="_blank"`
  safety.
- 3bd0364: Add an opt-in way to ship only the theme CSS an app uses.
  `@ghostvue/themes/components` exports the same themed components as
  `@ghostvue/themes` without importing `default.css`. Pair it with one palette
  (`calm.css`, `vibrant.css`, `mono.css`, or `tokens.css`), the new
  `@ghostvue/themes/base.css` (shared wrapper scope and semantic recipes), and the
  new per-component `@ghostvue/themes/recipes/<family>.css` files. The
  `@ghostvue/themes` entry and `default.css` load and style exactly as before.
- 60de400: Recalibrate authored design tokens and flagship theme defaults to Precision SaaS proportions:

  - Set `control.size.{sm,md,lg}.min` to `32 / 36 / 40px` (`comfortable`), `28 / 32 / 36px` (`compact`), and `36 / 40 / 44px` (`spacious`), preserving the `44px` (`2.75rem`) coarse-pointer floor.
  - Scale `control.size.{sm,md,lg}.font` deterministically across densities (`12 / 13 / 14px` compact, `13 / 14 / 15px` comfortable, `13 / 15 / 16px` spacious) and resolve UI `font.size.{xs,sm,md,lg}` to crisp `rem` values while keeping display headings (`xl`–`3xl`) fluid.
  - Add primitive spacing and height steps (`space.0_5`, `space.1_5`, `space.2_5`, `control.height.44`) and calibrate control padding, `action.label.weight` (`500`), `size.focus.width` (`2px`), and corner radii (`6px` `radius.md` / `action.radius`, `8px` `radius.lg` at `roundness: 1`).
  - Replace `default` hue-shifting solid action gradients and `elevation.2` rest shadows with single-hue fills, a hairline top bevel, and `elevation.1` rest shadows while keeping `vibrant` aurora/gradient recipes expressive; adjust `calm` `roundness` from `0.3` to `0.5`.
  - Harmonize dark-mode `surface.bg`, `surface.subtle.bg`, `surface.muted.bg`, and `elevation.1..5.bg` onto one neutral-tinted OKLCH slate/ink progression (retinted per neutral seed in `defineTheme`).

- 2117dff: Add `GhostScrollSpy` section-navigation compound parts, `useGhostScrollSpy`, and scroll measurement helpers. The docs landing rail migrates onto the new primitive without visual changes.

  ScrollSpy preserves consumer classes and link metadata, tracks each enabled section once, and updates after viewport or content resizes. Nested navigation respects scroll padding and target scroll margins.

  Tracking follows changes to the scroll container, including template refs that resolve after mount. Progress stays at zero when no targets can be measured.

  Enabled custom link components receive the resolved `href`.

  Link activation and `scrollTo()` jump immediately when reduced motion is requested, even with CSS smooth scrolling.

  Changes to `probeOffset` or `endThreshold` refresh the active section and its progress at the current scroll position.

  Consecutive scroll measurements request the same controlled selection change only once while the current value stays the same. Adding or removing a target section refreshes tracking even when the scroll container does not resize.

- 28b4d28: Add a themed single-sort GhostDataTable with native table semantics, size and surface settings, sticky headers, and accessible selection and busy states. GhostDataTablePreset also supports opt-in toolbar, bulk-action, and pagination slots while retaining existing column cell slots.

### Patch Changes

- 9d5a12a: Calibrate themed menus and options with smaller rows, refine table typography and dividers, and use a danger border and focus ring on invalid text and number fields. Add entry motion to themed overlay surfaces with an opacity-only transition for reduced motion.
- da68ec0: Clean up published package contents. `@ghostvue/themes` no longer ships
  compiled test files. `@ghostvue/themes`, `@ghostvue/nuxt`,
  `@ghostvue/eslint-plugin`, and `@ghostvue/mcp` no longer ship `.js.map` or
  `.d.ts.map` files, which pointed at `src/` files the packages do not include.
  `@ghostvue/vue`, `@ghostvue/themes`, `@ghostvue/nuxt`, and
  `@ghostvue/eslint-plugin` now include a README.
- 93b82fa: Keep the base stylesheet in production builds. The package entry
  (`dist/index.js`) is now listed in `sideEffects`, so Vite and other bundlers no
  longer tree-shake its `import './default.css'` when an app only uses themed
  components. Importing from `@ghostvue/themes` loads the base styles without a
  separate `@ghostvue/themes/default.css` import, as documented.
- Updated dependencies [67fb75d]
- Updated dependencies [a6f527b]
- Updated dependencies [2897719]
- Updated dependencies [2117dff]
- Updated dependencies [da68ec0]
- Updated dependencies [28b4d28]
  - @ghostvue/vue@0.1.0
