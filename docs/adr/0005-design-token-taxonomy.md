# ADR 0005: Design token taxonomy and source format

- Status: accepted (CSS prefix, component tokens, and mode switching
  superseded by [ADR 0007](./0007-token-pipeline.md))
- Date: 2026-11-11
- Decision owners: repository maintainers

## Context

[docs/architecture/styling.md](../architecture/styling.md) still says no
token taxonomy exists because the foundation phase has not seen components.
[PR #20](https://github.com/zprue743/slop-ui/pull/20) already authors a
runtime token surface in `packages/themes/src/default.css`:

- semantic theme: `--slop-theme-surface`, `--slop-theme-color`
- component: `--slop-button-{tone}-color`, `--slop-button-size-*`, focus,
  radius, and related `--slop-button-*` properties
- private derived: `--_slop-button-*`
- color schemes via `light-dark()` and `data-color-scheme` on `.slop-theme`

Those names will become a compatibility contract if Button merges without a
taxonomy. slop-ui is AI-native: tokens must be a format agents can read and
write, not only CSS a browser can apply.

ADR 0004 (SLO-10) says themed components style through CSS variables from
tokens. This ADR names the source, tiers, and compile outputs. Building the
pipeline is **out of scope**; this PR is ADR plus docs.

## Decision

### Source of truth

Authored source is **DTCG JSON** (W3C Design Tokens Community Group `$type`,
`$value`, `$description`, `{reference.path}` aliases). Agents and design
tools already speak this format; a proprietary JS/YAML DSL would not.

Suggested layout (not created in this PR):

```text
packages/themes/tokens/primitives.json
packages/themes/tokens/semantic.json
packages/themes/tokens/components/button.json
```

### Tiers

Lower tiers may only reference equal or higher tiers (component → semantic
→ primitive).

1. **Primitive.** Raw palette, type, space, radius, duration. No product
   intent. Example: `color.blue.700` = `#1d4ed8`.
2. **Semantic.** Intent: surface, foreground, accent, danger, focus.
   Example: `color.accent` → `{color.blue.700}`.
3. **Component.** One component's defaults. Example: `button.accent.color`
   → `{color.accent}`.

### Compile outputs

A follow-up pipeline compiles DTCG JSON to all three of:

1. **CSS custom properties** — runtime for themed components and consumer
   overrides (`--slop-button-accent-color`).
2. **TypeScript types** — a typed map of public token names for Vue props,
   docs, and codegen.
3. **JSON manifest** — resolved values for MCP and agents. This is the
   _token_ manifest; it is not the per-component gate manifest in ADR 0002
   (SLO-8).

`default.css` in PR #20 is the current runtime snapshot, not the long-term
source. The pipeline should be able to emit equivalent public custom
properties so #20 does not become a parallel system.

### Naming

- Authored: `{group}.{path}` with groups `color`, `space`, `font`,
  `radius`, `duration`, plus one group per component (`button`).
- Runtime CSS: `--slop-{group}-{path}` (`--slop-color-accent`,
  `--slop-button-radius`). Vue components are `SlButton` (ADR 0003); CSS
  stays `slop-*` to avoid Shoelace's `sl-` namespace.
- Private CSS: `--_slop-*` is unpublished.

### Reconciliation with PR #20 `default.css`

| Runtime CSS (PR #20)                                     | Tier               | Authored token                      | Compile target                               |
| -------------------------------------------------------- | ------------------ | ----------------------------------- | -------------------------------------------- |
| `--slop-theme-surface`, `--slop-theme-color`             | semantic           | `color.surface`, `color.foreground` | CSS + types + JSON                           |
| `--slop-button-accent-color` and other `--slop-button-*` | component          | `button.*`                          | CSS + types + JSON                           |
| `light-dark(#1d4ed8, #60a5fa)` literals                  | primitive (inline) | `color.blue.700` / `color.blue.400` | source; CSS may keep `light-dark()`          |
| `--_slop-button-*`                                       | not public         | none                                | CSS only, not in the TS/JSON public manifest |

Do not rename `--slop-theme-surface` inside #20. The pipeline may emit
`--slop-color-surface` as an alias later. Light and dark stay one public
name using CSS `light-dark()` at emit time, matching #20.

Primitives may exist only in DTCG source until two components share a
value; #20's "component-scoped until shared" rule still applies to _CSS
publication_, not to whether the authored file may list them.

Example aligned with #20's accent solid:

```json
{
  "color": {
    "blue": {
      "700": { "$type": "color", "$value": "#1d4ed8" }
    }
  }
}
```

```json
{
  "color": {
    "accent": { "$type": "color", "$value": "{color.blue.700}" }
  }
}
```

```json
{
  "button": {
    "accent": {
      "color": { "$type": "color", "$value": "{color.accent}" }
    }
  }
}
```

Emitted CSS (already the public shape in #20):

```css
--slop-button-accent-color: #1d4ed8;
```

## Alternatives considered

**CSS-only tokens forever (no DTCG).** Rejected. Agents, Figma, and
multi-platform emit need a typed source. CSS is an output, not the source.

**Token Script / YAML / Style Dictionary JS as the authored format.**
Rejected. DTCG is the vendor-neutral schema those tools ingest.

**Compile to CSS only, skip TS types and JSON.** Rejected. The owner
requires all three outputs so Vue, docs, and MCP share one catalog.

**Publish the full primitive palette in CSS on day one.** Rejected. #20
avoided a global color system before a second component shared values.
Primitives belong in DTCG source first.

**Rename `--slop-theme-*` in #20 now.** Deferred. Aliases can land with the
pipeline; a rename fights an open PR for no runtime gain.

## Consequences

- [docs/architecture/tokens.md](../architecture/tokens.md) is the taxonomy
  reference. `styling.md` points here and no longer claims the foundation
  phase has no tokens.
- #20's `default.css` remains valid as the current CSS output. New theme
  CSS must not invent a parallel naming scheme.
- A follow-up implements the emit pipeline and wires the JSON manifest into
  MCP. No pipeline, DTCG packages, or CSS rewrite ships in this PR.

## Compatibility implications

Docs only. Once #20 merges, `--slop-button-*` and `--slop-theme-*` are
compatibility-bearing names. Changing a public custom property is breaking;
adding primitives, aliases, TS types, or a JSON manifest is additive.
`--_slop-*` stays private. No SSR/a11y impact beyond the contrast contracts
the theme already documents.
