# Design tokens

Token taxonomy and source format were accepted in
[ADR 0005](../adr/0005-design-token-taxonomy.md). Public CSS names, nested
theme/mode attributes, and the compile pipeline are
[ADR 0007](../adr/0007-token-pipeline.md). This page is the working
authoring reference.

## Source of truth

Authored tokens are **DTCG JSON** (W3C Design Tokens Community Group):
`$type`, `$value`, `$description`, and `{reference.path}` aliases. Agents
and design tools read and write this format. CSS is a compile output, not
the source.

```text
packages/themes/tokens/seeds.json
packages/themes/tokens/generated/ramps.json
packages/themes/tokens/primitives.json
packages/themes/tokens/semantic.json
packages/themes/tokens/semantic.dark.json
packages/themes/tokens/semantic.compact.json
packages/themes/tokens/semantic.spacious.json
```

`seeds.json` holds brand hex values. The compiler generates 12-step OKLCH
ramps per hue (`neutral`, `primary`, `success`, `warning`, `danger`,
`info`) into `generated/ramps.json`. Light-tuned and dark-tuned palettes
are independent; dark is not an inversion of light. Those ramps are
primitive tokens, committed and snapshot-checked like the other compile
outputs.

`semantic.json` is the default (light, and any token that does not change
by mode). `semantic.dark.json` overlays dark `$value`s onto existing
semantic tokens. A rest-state token may nest interaction states on the same
node (`bg` plus `bg.hover`). There is no `tokens/components/` tree.

`pnpm --filter @ghostvue/themes build` compiles these files to CSS custom
properties, TypeScript constants, a JSON catalog, and
[the token catalog docs page](../themes/tokens.md). `pnpm contrast` (part
of `pnpm verify`) checks WCAG 2 AA on semantic text/background pairs.

## Tiers

1. **Primitive** — raw palette and dimension literals. No product intent
   (`color.primary.700`). Color ramps, elevation shadow tints, duration,
   easing, spring parameters, the 4px spacing scale, control heights, and
   type primitives live here.
2. **Semantic** — product intent as `role.part.state` across `action`,
   `surface`, `scrim`, `text`, `border`, `status`, `focus`, `control`,
   `elevation`, `material`, `gradient`, `motion`, `space`, `radius`,
   `type`, `roundness`, `interactive`, and `state` (`action.primary.bg`,
   `elevation.2.shadow`, `motion.duration.fast`, `space.gap.sm`,
   `state.layer.hover`, `interactive.spotlight.size`).
   Components consume semantic tokens only.

Semantic tokens may reference primitives or other semantic tokens.
Primitive tokens may only reference primitives. There are no per-component
tokens.

## Compile outputs

| Output                     | Role                                                 |
| -------------------------- | ---------------------------------------------------- |
| CSS custom properties      | Runtime for themed components and consumer overrides |
| TypeScript constants/types | Typed public token names for Vue, docs, and codegen  |
| JSON manifest              | Resolved values for MCP `get_tokens` and agents      |

The JSON token catalog is not the per-component gate manifest in
[ADR 0006](../adr/0006-component-manifest-schema.md). It is published as
`@ghostvue/themes/tokens.json`. Semantic CSS is `@ghostvue/themes/tokens.css`
and is concatenated into `@ghostvue/themes/default.css`.

Public CSS names are `--ghost-<role>-<part>-<state>`
(`--ghost-action-primary-bg`, `--ghost-action-primary-bg-hover`).
The standalone `scrim` role publishes `--ghost-scrim`. Vue components
are `GhostButton` (ADR 0003); class names stay `ghost-*`. Primitive tokens are
not published as CSS. Private derived properties (`--_ghost-*`) are not in
the TS or JSON public catalog.

## Theme and mode switching

`data-ghost-theme`, `data-ghost-mode`, and `data-ghost-density` nest on any subtree.
The default theme name is `default`; `.ghost-theme` without `data-ghost-theme`
implies it. Named themes match `[data-ghost-theme='name']`.
`.ghost-themed-scope` is a recipe scope only — not a token host — so a themed
wrapper inside a nested flagship inherits that flagship. Unset
`data-ghost-mode` follows `prefers-color-scheme`. Unset `data-ghost-density` is
`comfortable` globally; a generated theme may set a different unset-density
default under its own `data-ghost-theme`. `data-ghost-mode="light"` or `"dark"`
overrides the preference, including inside a parent with a different mode.
Compact, comfortable, and spacious density attributes work the same way.

```vue
<main class="ghost-theme">...</main>
<section data-ghost-mode="dark">...</section>
<aside
  data-ghost-theme="default"
  data-ghost-mode="light"
  data-ghost-density="compact"
>
  ...
</aside>
```

Override a semantic custom property on the same subtree:

```css
.product-theme {
  --ghost-action-primary-bg: #7c3aed;
  --ghost-action-primary-bg-hover: #6d28d9;
}
```

Token selectors use `:where()` inside `@layer ghostvue-theme`, so unlayered
consumer styles win.

`--ghost-scrim` is the shared modal-backdrop color. It mixes the theme's
darkest neutral palette step (`color.neutral.1000` in light mode,
`color.neutral.dark.1000` in dark mode) at 60% opacity with transparent,
leaving 40% of the page visible. The default, calm, vibrant, and mono themes
all inherit this role through the token pipeline. In forced colors it is
transparent so the backdrop does not obscure the user's high-contrast page.

## Contrast, forced colors, and follow-ups

WCAG 2 AA (4.5:1) is required for every semantic text/background pair,
including `*.fg` on matching `*.bg` / `*.bg.hover` / `*.bg.active`, in
both modes. `pnpm contrast` fails the build on WCAG misses. APCA Lc
(0.0.98G-4g, implemented locally; no `apca` package) is printed as
advisory and never fails the build.

`@media (forced-colors: active)` maps semantic color variables to system
colors (`Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `GrayText`,
`Highlight`). GhostButton keeps its own forced-colors rules so the control
stays usable when palettes are discarded.

Unset `data-ghost-mode` follows `prefers-color-scheme` in CSS. No JavaScript
is required to pick the initial mode, so SSR does not flash the opposite
palette.

Elevation 0–5, hairline borders, solid/glass/grain materials, and oklch
gradients are GHO-64. Each elevation level is a surface, a layered
shadow (DTCG `shadow` composites), and a hairline. Glass uses an inline
SVG noise overlay and an `@supports` fallback; forced-colors maps the
new color roles to system colors. Visual recipes use `data-elevation`,
`data-material`, and `data-gradient` in theme CSS — not per-component
tokens. See [elevation, materials, and gradients](../themes/elevation.md).

Motion durations, cubic-bezier easing, and spring presets are GHO-65.
Springs are authored as stiffness / damping / mass and compile to CSS
`linear()` plus a settle duration. Every duration CSS value is
`calc(<ms> * var(--ghost-motion-intensity, 1))`, redeclared on descendants so a
nested `--ghost-motion-intensity` re-evaluates. Under
`prefers-reduced-motion: reduce`, movement tokens collapse to opacity-only
or 80ms feedback so state changes stay visible. See
[motion](../themes/motion.md).

Density, fluid type, and roundness are GHO-66. Default density is
comfortable. Compact and spacious overlay spacing, control heights, and
radius through `data-ghost-density`. `--ghost-roundness` (0 sharp → 1 designed,
including pill) scales every radius token via `calc()`. Type uses a system
font stack and `clamp()` sizes; letter-spacing, tabular numbers, and
OpenType feature tokens are semantic `--ghost-type-*` variables. Coarse
pointers floor control heights to 44px. See
[density, type, and roundness](../themes/density.md).

State-layer overlay opacities (`state.layer.hover` / `press` /
`selected` / `dragged`) and action gradient stops are GHO-67. GhostButton
applies those overlays with a pseudo-element so they work on every tone
and mode, including gradient fills. `pnpm contrast` checks
`action.*.fg` against both gradient end stops.

Flagship themes (calm enterprise, vibrant expressive, minimal monochrome)
are generated by Node-only `defineTheme` ([ADR 0008](../adr/0008-define-theme.md),
GHO-68) and published as `@ghostvue/themes/calm.css`, `vibrant.css`, and
`mono.css`. See [defineTheme and flagship themes](../themes/define-theme.md).

## Authoring rules

- Prefer aliases (`{color.primary.700}`) over copied hex values in semantic
  files.
- Do not put the tier word in the token name.
- Do not add per-component tokens; map component tones onto semantic roles
  (`accent` → `action.primary`).
- Shadow tokens use the DTCG `shadow` composite (`offsetX`, `offsetY`,
  `blur`, `spread`, `color`, optional `inset`). Gradients use stop lists
  or layered `{ style, interpolation, stops }` objects and compile to
  CSS `in oklch`.
- Hairline width may set `$extensions.ghostvue.highDpr` so 2dppx screens
  paint one device pixel. Motion tokens may set
  `$extensions.ghostvue.reducedMotion` for the `prefers-reduced-motion:
reduce` override. Control minima may set `$extensions.ghostvue.touchMin`
  so `@media (pointer: coarse)` floors mapped heights to 44px.
- Density overlays live in `semantic.compact.json` and
  `semantic.spacious.json`, mirroring `semantic.dark.json`.
- cubicBezier values are four numbers. Spring values are
  `{ stiffness, damping, mass }` and may be aliased from a duration token
  to emit the settle time.
- Headless `@ghostvue/vue` components must not require these tokens to
  function. Themed wrappers consume them as in ADR 0004.
