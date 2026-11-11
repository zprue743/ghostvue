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

`pnpm --filter @slop-ui/themes build` compiles these files to CSS custom
properties, TypeScript constants, a JSON catalog, and
[the token catalog docs page](../themes/tokens.md). `pnpm contrast` (part
of `pnpm verify`) checks WCAG 2 AA on semantic text/background pairs.

## Tiers

1. **Primitive** — raw palette and dimension literals. No product intent
   (`color.primary.700`). Color ramps, elevation shadow tints, duration,
   easing, and spring parameters live here; density belongs to SLO-66.
2. **Semantic** — product intent as `role.part.state` across `action`,
   `surface`, `text`, `border`, `status`, `focus`, `control`,
   `elevation`, `material`, `gradient`, and `motion` (`action.primary.bg`,
   `elevation.2.shadow`, `motion.duration.fast`). Components consume
   semantic tokens only.

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
`@slop-ui/themes/tokens.json`. Semantic CSS is `@slop-ui/themes/tokens.css`
and is concatenated into `@slop-ui/themes/default.css`.

Public CSS names are `--sl-<role>-<part>-<state>`
(`--sl-action-primary-bg`, `--sl-action-primary-bg-hover`). Vue components
are `SlButton` (ADR 0003); class names stay `slop-*`. Primitive tokens are
not published as CSS. Private derived properties (`--_slop-*`) are not in
the TS or JSON public catalog.

## Theme and mode switching

`data-sl-theme` and `data-sl-mode` nest on any subtree. The default theme
name is `default`; `.slop-theme` implies it. Unset `data-sl-mode` follows
`prefers-color-scheme`. `data-sl-mode="light"` or `"dark"` overrides the
preference, including inside a parent with a different mode.

```vue
<main class="slop-theme">...</main>
<section data-sl-mode="dark">...</section>
<aside data-sl-theme="default" data-sl-mode="light">...</aside>
```

Override a semantic custom property on the same subtree:

```css
.product-theme {
  --sl-action-primary-bg: #7c3aed;
  --sl-action-primary-bg-hover: #6d28d9;
}
```

Token selectors use `:where()` inside `@layer slop-ui-theme`, so unlayered
consumer styles win.

## Contrast, forced colors, and follow-ups

WCAG 2 AA (4.5:1) is required for every semantic text/background pair,
including `*.fg` on matching `*.bg` / `*.bg.hover` / `*.bg.active`, in
both modes. `pnpm contrast` fails the build on WCAG misses. APCA Lc
(0.0.98G-4g, implemented locally; no `apca` package) is printed as
advisory and never fails the build.

`@media (forced-colors: active)` maps semantic color variables to system
colors (`Canvas`, `CanvasText`, `ButtonFace`, `ButtonText`, `GrayText`,
`Highlight`). SlButton keeps its own forced-colors rules so the control
stays usable when palettes are discarded.

Unset `data-sl-mode` follows `prefers-color-scheme` in CSS. No JavaScript
is required to pick the initial mode, so SSR does not flash the opposite
palette.

Elevation 0–5, hairline borders, solid/glass/grain materials, and oklch
gradients are SLO-64. Each elevation level is a surface, a layered
shadow (DTCG `shadow` composites), and a hairline. Glass uses an inline
SVG noise overlay and an `@supports` fallback; forced-colors maps the
new color roles to system colors. Visual recipes use `data-elevation`,
`data-material`, and `data-gradient` in theme CSS — not per-component
tokens. See [elevation, materials, and gradients](../themes/elevation.md).

Motion durations, cubic-bezier easing, and spring presets are SLO-65.
Springs are authored as stiffness / damping / mass and compile to CSS
`linear()` plus a settle duration. Every duration CSS value is
`calc(<ms> * var(--sl-motion-intensity, 1))`, redeclared on descendants so a
nested `--sl-motion-intensity` re-evaluates. Under
`prefers-reduced-motion: reduce`, movement tokens collapse to opacity-only
or 80ms feedback so state changes stay visible. See
[motion](../themes/motion.md).

Flagship themes (calm enterprise, vibrant expressive, minimal monochrome)
are SLO-68. Default density is comfortable (SLO-66).

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
- Hairline width may set `$extensions.slop.ui.highDpr` so 2dppx screens
  paint one device pixel. Motion tokens may set
  `$extensions.slop.ui.reducedMotion` for the `prefers-reduced-motion:
reduce` override.
- cubicBezier values are four numbers. Spring values are
  `{ stiffness, damping, mass }` and may be aliased from a duration token
  to emit the settle time.
- Headless `@slop-ui/vue` components must not require these tokens to
  function. Themed wrappers consume them as in ADR 0004.
