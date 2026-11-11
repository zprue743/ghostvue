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
packages/themes/tokens/primitives.json
packages/themes/tokens/semantic.json
packages/themes/tokens/semantic.dark.json
```

`semantic.json` is the default (light, and any token that does not change
by mode). `semantic.dark.json` overlays dark `$value`s onto existing
semantic tokens. A rest-state token may nest interaction states on the same
node (`bg` plus `bg.hover`). There is no `tokens/components/` tree.

`pnpm --filter @slop-ui/themes build` compiles these files to CSS custom
properties, TypeScript constants, a JSON catalog, and
[the token catalog docs page](../themes/tokens.md).

## Tiers

1. **Primitive** — raw palette and dimension literals. No product intent
   (`color.blue.700`). Color ramps, elevation, motion, and density scales
   belong to SLO-63–SLO-66; this pipeline only seeds values SlButton needs.
2. **Semantic** — product intent as `role.part.state`
   (`action.primary.bg`, `action.primary.bg.hover`). Components consume
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

## Contrast and follow-ups

WCAG AA is required and APCA is advisory. That CI gate is SLO-63, not this
pipeline. Flagship themes (calm enterprise, vibrant expressive, minimal
monochrome) are SLO-68. Default density is comfortable (SLO-66).

## Authoring rules

- Prefer aliases (`{color.blue.700}`) over copied hex values in semantic
  files.
- Do not put the tier word in the token name.
- Do not add per-component tokens; map component tones onto semantic roles
  (`accent` → `action.primary`).
- Headless `@slop-ui/vue` components must not require these tokens to
  function. Themed wrappers consume them as in ADR 0004.
