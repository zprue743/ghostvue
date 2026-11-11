# ADR 0007: Token compile pipeline and public CSS names

- Status: accepted
- Date: 2026-11-11
- Decision owners: Zac Pruett, repository maintainers
- Supersedes in part: [ADR 0005](./0005-design-token-taxonomy.md) (CSS
  prefix, component token tier, and `light-dark()` / `data-color-scheme`
  switching)

## Context

[ADR 0005](./0005-design-token-taxonomy.md) accepted DTCG JSON as the authored
source and required three compile outputs (CSS custom properties, TypeScript
types, JSON for MCP). It did not ship the pipeline. The runtime snapshot in
`packages/themes/src/default.css` still used `--slop-*` names, a
per-component `button.*` tier, and CSS `light-dark()` gated by
`data-color-scheme` on `.slop-theme`.

Those choices would freeze the wrong public contract: Shoelace already owns
the `sl-` custom-element namespace, but this library's components are `Sl*`
(ADR 0003) and a short `--sl-*` CSS prefix is the name agents and consumers
will type. Per-component tokens would duplicate every later control. Nested
theme and mode switching cannot be expressed with one `color-scheme` attribute
on the theme root.

This ADR records the binding decisions for SLO-37 (the emit pipeline) and
leaves ramp generation, contrast CI, density, motion, elevation, and flagship
themes to follow-up issues.

## Decision

### Source of truth

Authored tokens remain **DTCG JSON** (`$type`, `$value`, `$description`,
`{reference.path}` aliases) under `packages/themes/tokens/`:

```text
packages/themes/tokens/primitives.json
packages/themes/tokens/semantic.json
packages/themes/tokens/semantic.dark.json
```

`semantic.json` is the default (light, and any token that does not change by
mode). `semantic.dark.json` overlays dark-mode `$value`s onto existing
semantic tokens. There is no `tokens/components/` tree.

### Tiers

1. **Primitive** — raw palette and dimension literals. No product intent
   (`color.blue.700`). Color ramps, elevation, motion, and density scales are
   **not** authored here; SLO-63–SLO-66 own those systems. This pipeline seeds
   only the literals SlButton already used.
2. **Semantic** — product intent as `role.part.state` (for example
   `action.primary.bg` and `action.primary.bg.hover`). Components consume
   semantic tokens only.

Semantic tokens may reference primitives or other semantic tokens. Primitive
tokens may only reference primitives. There are **no per-component tokens**.

### CSS names

Public custom properties are `--sl-<role>-<part>-<state>`: the semantic path
with dots replaced by hyphens (`action.primary.bg.hover` →
`--sl-action-primary-bg-hover`). Primitive tokens are not published as CSS;
consumers override semantic properties.

Private derived properties used by a single stylesheet (`--_slop-*` today)
stay unpublished and are not in the TypeScript or JSON catalogs.

Class names remain `slop-*`. That prefix still avoids Shoelace's custom
element namespace; only the CSS variable prefix is `--sl-`.

### Theme and mode switching

Themes and modes switch through `data-sl-theme` and `data-sl-mode` on **any
subtree**. They nest: a descendant attribute overrides the ancestor. The
default theme name is `default`. `.slop-theme` implies that theme without
requiring the attribute.

Unset `data-sl-mode` follows `prefers-color-scheme`. `data-sl-mode="light"`
or `"dark"` overrides the preference, including inside a parent with a
different mode. `color-scheme` is set to `light dark` on a mode-less
`.slop-theme` and to the explicit mode when `data-sl-mode` is present.

Consumer overrides are ordinary CSS custom property assignments. Token
selectors use `:where()` inside `@layer slop-ui-theme` so unlayered consumer
styles win.

`data-color-scheme` and CSS `light-dark()` are replaced. This package has not
been published; no compatibility aliases ship.

### Compile outputs

`@slop-ui/themes` build compiles DTCG to all three of:

1. **CSS custom properties** — semantic `--sl-*` variables, light/dark/system
   switching. Concatenated into the published `default.css` and also exported
   as `tokens.css`.
2. **TypeScript constants and types** — a typed map of public token names,
   CSS variable names, resolved light/dark values, and descriptions.
3. **JSON manifest** — the same catalog for a future MCP `get_tokens` tool.
   This is not the per-component gate manifest in ADR 0006.

A docs page listing the catalog is generated from the JSON manifest.

### Contrast, ramps, and flagship themes (recorded, not built)

- **CI contrast (SLO-63):** WCAG AA is required; APCA is advisory. Implemented
  in `pnpm contrast` with `culori.wcagContrast` and a local APCA 0.0.98G-4g
  function. `culori` is a devDependency of `@slop-ui/themes`.
- **Flagship themes (SLO-68):** calm enterprise, vibrant expressive, and
  minimal monochrome. This pipeline emits `default` only.
- **Density (SLO-66):** default density is comfortable. Size tokens in the
  seed set are the values SlButton already used, not a density system.
- Motion (SLO-65) remains out of scope of this pipeline ADR.

## Alternatives considered

**Keep `--slop-*` and `light-dark()` from ADR 0005.** Rejected. The owner
chose `--sl-<role>-<part>-<state>` and attribute-based nested modes. `#20`'s
names were a runtime snapshot, not a published contract.

**Keep a component token tier (`button.accent.color`).** Rejected. Every
later control would copy the same roles. Semantic `action.*`, `control.*`,
`focus.*`, and `surface.*` are the customization API; component CSS maps
tones onto those roles.

**Switch modes only on `.slop-theme` via `color-scheme`.** Rejected. Nested
previews, docs, and mixed-mode applications need `data-sl-mode` on any
subtree, with the default still following the operating system.

**Add Style Dictionary or `culori` now.** Rejected. The seed set is a small
JSON graph; a local compiler is enough. `culori` waits for SLO-63.

**Publish primitive CSS variables on day one.** Rejected. The public CSS
shape is semantic `--sl-<role>-<part>-<state>`. Primitives stay in DTCG, TS,
and JSON so ramps can land without renaming the runtime API.

## Consequences

- `packages/themes` owns the compiler, seed tokens, and generated CSS / TS /
  JSON. SlButton theme CSS consumes `--sl-*` semantic variables.
- [docs/architecture/tokens.md](../architecture/tokens.md) is the working
  authoring reference and no longer describes a future pipeline.
- ADR 0005 remains the record that DTCG and the three compile outputs were
  chosen; CSS prefix, component tokens, and mode switching follow this ADR.
- Follow-ups: SLO-65 motion, SLO-66 density, SLO-68 flagship themes, MCP
  `get_tokens`. SLO-63 (ramps, semantic text/border/status, contrast CI,
  forced-colors mapping) and SLO-64 (elevation, hairline, materials,
  gradients) landed on this pipeline.

## Amendments

- 2026-11-11: SLO-63 generates 12-step OKLCH ramps from `seeds.json` with
  `culori`, expands semantic `text` / `border` / `status` / `action` roles,
  maps `--sl-*` variables under `forced-colors`, and gates WCAG 2 AA in
  `pnpm verify`. Dark palettes are tuned separately, not inverted from
  light. APCA Lc is advisory.
- 2026-11-11: SLO-64 extends the compiler with DTCG `shadow` composites
  and layered `gradient` values serialized `in oklch`. Semantic
  `elevation` / `material` / `gradient` roles, a hairline width that
  becomes 0.5px at 2dppx, glass/grain recipes, and contrast pairs on
  elevation fills ship on this pipeline. Motion (SLO-65) is still out of
  scope.

## Compatibility implications

Breaking relative to the `#20` snapshot: `--slop-theme-*` / `--slop-button-*`
and `data-color-scheme` are replaced by `--sl-*` and `data-sl-mode` /
`data-sl-theme`. The package is unpublished (`0.0.0`); no alias layer is
provided. Headless `@slop-ui/vue` is unchanged. Themed contrast, focus,
forced-colors, and reduced-motion behavior stay in component CSS; this
pipeline does not implement the WCAG AA CI gate.
