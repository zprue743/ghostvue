# ADR 0007: Token compile pipeline and public CSS names

Identifiers updated for the GhostVue rebrand (ADR 0010).

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
`packages/themes/src/default.css` still used `--ghost-*` names, a
per-component `button.*` tier, and CSS `light-dark()` gated by
`data-color-scheme` on `.ghost-theme`.

Those choices would freeze the wrong public contract: Shoelace already owns
the `sl-` custom-element namespace, but this library's components are `Ghost*`
(ADR 0003) and a short `--ghost-*` CSS prefix is the name agents and consumers
will type. Per-component tokens would duplicate every later control. Nested
theme and mode switching cannot be expressed with one `color-scheme` attribute
on the theme root.

This ADR records the binding decisions for GHO-37 (the emit pipeline) and
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
packages/themes/tokens/semantic.compact.json
packages/themes/tokens/semantic.spacious.json
```

`semantic.json` is the default (light, and any token that does not change by
mode). `semantic.dark.json` overlays dark-mode `$value`s onto existing
semantic tokens. There is no `tokens/components/` tree.

### Tiers

1. **Primitive** — raw palette and dimension literals. No product intent
   (`color.blue.700`). Color ramps, elevation, motion, and density scales are
   **not** authored here; GHO-63–GHO-66 own those systems. This pipeline seeds
   only the literals GhostButton already used.
2. **Semantic** — product intent as `role.part.state` (for example
   `action.primary.bg` and `action.primary.bg.hover`). Components consume
   semantic tokens only.

Semantic tokens may reference primitives or other semantic tokens. Primitive
tokens may only reference primitives. There are **no per-component tokens**.

### CSS names

Public custom properties are `--ghost-<role>-<part>-<state>`: the semantic path
with dots replaced by hyphens (`action.primary.bg.hover` →
`--ghost-action-primary-bg-hover`). Primitive tokens are not published as CSS;
consumers override semantic properties.

Private derived properties used by a single stylesheet (`--_ghost-*` today)
stay unpublished and are not in the TypeScript or JSON catalogs.

Class names remain `ghost-*`. That prefix still avoids Shoelace's custom
element namespace; only the CSS variable prefix is `--ghost-`.

### Theme and mode switching

Themes and modes switch through `data-ghost-theme` and `data-ghost-mode` on **any
subtree**. They nest: a descendant attribute overrides the ancestor. The
default theme name is `default`. `.ghost-theme` implies that theme without
requiring the attribute.

Unset `data-ghost-mode` follows `prefers-color-scheme`. `data-ghost-mode="light"`
or `"dark"` overrides the preference, including inside a parent with a
different mode. `color-scheme` is set to `light dark` on a mode-less
`.ghost-theme` and to the explicit mode when `data-ghost-mode` is present.

Consumer overrides are ordinary CSS custom property assignments. Token
selectors use `:where()` inside `@layer ghostvue-theme` so unlayered consumer
styles win.

`data-color-scheme` and CSS `light-dark()` are replaced. This package has not
been published; no compatibility aliases ship.

### Compile outputs

`@ghostvue/themes` build compiles DTCG to all three of:

1. **CSS custom properties** — semantic `--ghost-*` variables, light/dark/system
   switching. Concatenated into the published `default.css` and also exported
   as `tokens.css`.
2. **TypeScript constants and types** — a typed map of public token names,
   CSS variable names, resolved light/dark values, and descriptions.
3. **JSON manifest** — the same catalog for a future MCP `get_tokens` tool.
   This is not the per-component gate manifest in ADR 0006.

A docs page listing the catalog is generated from the JSON manifest.

### Contrast, ramps, and flagship themes

- **CI contrast (GHO-63):** WCAG AA is required; APCA is advisory. Implemented
  in `pnpm contrast` with `culori.wcagContrast` and a local APCA 0.0.98G-4g
  function. `culori` is a devDependency of `@ghostvue/themes`.
- **Flagship themes (GHO-68):** calm enterprise, vibrant expressive, and
  minimal monochrome. This pipeline still emits authored `default`; flagships
  are `defineTheme` output ([ADR 0008](./0008-define-theme.md)).
- **Density (GHO-66):** default density is comfortable. Implemented as
  nestable `data-ghost-density` overlays plus `--ghost-roundness`; see the
  GHO-66 amendment.

## Alternatives considered

**Keep `--ghost-*` and `light-dark()` from ADR 0005.** Rejected. The owner
chose `--ghost-<role>-<part>-<state>` and attribute-based nested modes. `#20`'s
names were a runtime snapshot, not a published contract.

**Keep a component token tier (`button.accent.color`).** Rejected. Every
later control would copy the same roles. Semantic `action.*`, `control.*`,
`focus.*`, and `surface.*` are the customization API; component CSS maps
tones onto those roles.

**Switch modes only on `.ghost-theme` via `color-scheme`.** Rejected. Nested
previews, docs, and mixed-mode applications need `data-ghost-mode` on any
subtree, with the default still following the operating system.

**Add Style Dictionary or `culori` now.** Rejected. The seed set is a small
JSON graph; a local compiler is enough. `culori` waits for GHO-63.

**Publish primitive CSS variables on day one.** Rejected. The public CSS
shape is semantic `--ghost-<role>-<part>-<state>`. Primitives stay in DTCG, TS,
and JSON so ramps can land without renaming the runtime API.

## Consequences

- `packages/themes` owns the compiler, seed tokens, and generated CSS / TS /
  JSON. GhostButton theme CSS consumes `--ghost-*` semantic variables.
- [docs/architecture/tokens.md](../architecture/tokens.md) is the working
  authoring reference and no longer describes a future pipeline.
- ADR 0005 remains the record that DTCG and the three compile outputs were
  chosen; CSS prefix, component tokens, and mode switching follow this ADR.
- Follow-ups: MCP `get_tokens`. GHO-63 (ramps, semantic
  text/border/status, contrast CI, forced-colors mapping), GHO-64
  (elevation, hairline, materials, gradients), GHO-65 (motion durations,
  easing, springs, reduced motion), GHO-66 (density, type, roundness),
  GHO-67 (state layers and the GhostButton reference theme), and GHO-68
  (`defineTheme` and flagships; [ADR 0008](./0008-define-theme.md)) landed
  on this pipeline.

## Amendments

- 2026-11-11: GHO-63 generates 12-step OKLCH ramps from `seeds.json` with
  `culori`, expands semantic `text` / `border` / `status` / `action` roles,
  maps `--ghost-*` variables under `forced-colors`, and gates WCAG 2 AA in
  `pnpm verify`. Dark palettes are tuned separately, not inverted from
  light. APCA Lc is advisory.
- 2026-11-11: GHO-64 extends the compiler with DTCG `shadow` composites
  and layered `gradient` values serialized `in oklch`. Semantic
  `elevation` / `material` / `gradient` roles, a hairline width that
  becomes 0.5px at 2dppx, glass/grain recipes, and contrast pairs on
  elevation fills ship on this pipeline. Motion (GHO-65) is still out of
  scope.
- 2026-11-11: GHO-65 extends the compiler with DTCG `cubicBezier` and
  `spring` (mass-spring-damper compiled to CSS `linear()` plus settle
  duration). Semantic `motion` durations wrap `calc()` with
  `--ghost-motion-intensity`. `$extensions.ghostvue.reducedMotion` overlays
  values under `prefers-reduced-motion: reduce`. Density (GHO-66) is
  still out of scope.
- 2026-11-11: GHO-66 adds a 4px spacing scale, nestable
  `data-ghost-density` (`compact` / `comfortable` / `spacious`; default
  comfortable) via overlay files, fluid `clamp()` type with a system
  font stack, and `--ghost-roundness` (0–1) that scales every radius
  token through `calc()`. Control heights use 28/32/36/40/48px with a
  44px coarse-pointer floor. Density (this amendment) is no longer out
  of scope.
- 2026-11-11: GHO-67 adds semantic `state.layer.*` overlay opacities,
  `state.mix.*` rest mixes, action gradient stops gated against `*.fg`,
  disabled `action.disabled.bg` / `fg` / `border`, and press/focus
  motion tokens. GhostButton is the reference consumer: token-only CSS,
  two-tone focus ring, spring press, and a documented state matrix.
- 2026-11-11: GHO-68 (`defineTheme`, flagship CSS, `.ghost-themed-scope`
  token-host change) is [ADR 0008](./0008-define-theme.md). This pipeline
  still compiles authored `default`; flagships are generated token sheets.

## Compatibility implications

Breaking relative to the `#20` snapshot: `--ghost-theme-*` / `--ghost-button-*`
and `data-color-scheme` are replaced by `--ghost-*` and `data-ghost-mode` /
`data-ghost-theme`. The package is unpublished (`0.0.0`); no alias layer is
provided. Headless `@ghostvue/vue` is unchanged. Themed contrast, focus,
forced-colors, and reduced-motion behavior stay in component CSS; this
pipeline does not implement the WCAG AA CI gate.
