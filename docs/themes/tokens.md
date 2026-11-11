<!-- Generated from packages/themes/tokens. Do not edit by hand. -->

# Design token catalog

Compiled from DTCG JSON in `@slop-ui/themes`. Semantic tokens are the
public CSS custom properties (`--sl-<role>-<part>-<state>`). Primitive
tokens are aliases for those values and are not published as CSS.
Override a semantic custom property on any subtree; `data-sl-theme` and
`data-sl-mode` nest. Unset `data-sl-mode` follows `prefers-color-scheme`.

Default theme: `default`. Modes: `light`, `dark`.

See [design tokens](../architecture/tokens.md) and
[ADR 0007](../adr/0007-token-pipeline.md).

## Semantic tokens

### action

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `action.danger.bg` | `--sl-action-danger-bg` | color | `#b91c1c` | `#f87171` | Solid danger action background. |
| `action.danger.bg.active` | `--sl-action-danger-bg-active` | color | `#7f1d1d` | `#fecaca` | Solid danger action background on press. |
| `action.danger.bg.hover` | `--sl-action-danger-bg-hover` | color | `#991b1b` | `#fca5a5` | Solid danger action background on hover. |
| `action.danger.fg` | `--sl-action-danger-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid danger action. |
| `action.disabled.opacity` | `--sl-action-disabled-opacity` | number | `0.55` | `0.55` | Shared unavailable-state opacity. |
| `action.duration` | `--sl-action-duration` | duration | `120ms` | `120ms` | Action color and opacity transition duration. |
| `action.gap` | `--sl-action-gap` | dimension | `0.5rem` | `0.5rem` | Space between action label and icon content. |
| `action.icon.size` | `--sl-action-icon-size` | dimension | `1.1em` | `1.1em` | Action icon size. |
| `action.label.weight` | `--sl-action-label-weight` | fontWeight | `600` | `600` | Action label font weight. |
| `action.neutral.bg` | `--sl-action-neutral-bg` | color | `#334155` | `#cbd5e1` | Solid neutral action background. |
| `action.neutral.bg.active` | `--sl-action-neutral-bg-active` | color | `#0f172a` | `#f1f5f9` | Solid neutral action background on press. |
| `action.neutral.bg.hover` | `--sl-action-neutral-bg-hover` | color | `#1e293b` | `#e2e8f0` | Solid neutral action background on hover. |
| `action.neutral.fg` | `--sl-action-neutral-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid neutral action. |
| `action.primary.bg` | `--sl-action-primary-bg` | color | `#1d4ed8` | `#60a5fa` | Solid primary action background. Maps to SlButton tone accent. |
| `action.primary.bg.active` | `--sl-action-primary-bg-active` | color | `#1e3a8a` | `#bfdbfe` | Solid primary action background on press. |
| `action.primary.bg.hover` | `--sl-action-primary-bg-hover` | color | `#1e40af` | `#93c5fd` | Solid primary action background on hover. |
| `action.primary.fg` | `--sl-action-primary-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid primary action. |
| `action.radius` | `--sl-action-radius` | dimension | `0.5rem` | `0.5rem` | Action corner radius. |
| `action.spinner.size` | `--sl-action-spinner-size` | dimension | `1.1em` | `1.1em` | Action loading-indicator size. |
| `action.spinner.width` | `--sl-action-spinner-width` | dimension | `2px` | `2px` | Default action spinner stroke width. |

### control

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `control.size.lg.min` | `--sl-control-size-lg-min` | dimension | `3.25rem` | `3.25rem` | Large control minimum block size. |
| `control.size.lg.padding.block` | `--sl-control-size-lg-padding-block` | dimension | `0.875rem` | `0.875rem` | Large control block padding. |
| `control.size.lg.padding.inline` | `--sl-control-size-lg-padding-inline` | dimension | `1.25rem` | `1.25rem` | Large control inline padding. |
| `control.size.md.min` | `--sl-control-size-md-min` | dimension | `2.75rem` | `2.75rem` | Medium control minimum block size. |
| `control.size.md.padding.block` | `--sl-control-size-md-padding-block` | dimension | `0.75rem` | `0.75rem` | Medium control block padding. |
| `control.size.md.padding.inline` | `--sl-control-size-md-padding-inline` | dimension | `1rem` | `1rem` | Medium control inline padding. |
| `control.size.sm.min` | `--sl-control-size-sm-min` | dimension | `2.25rem` | `2.25rem` | Small control minimum block size. |
| `control.size.sm.padding.block` | `--sl-control-size-sm-padding-block` | dimension | `0.5rem` | `0.5rem` | Small control block padding. |
| `control.size.sm.padding.inline` | `--sl-control-size-sm-padding-inline` | dimension | `0.75rem` | `0.75rem` | Small control inline padding. |

### focus

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `focus.ring.color` | `--sl-focus-ring-color` | color | `#0f172a` | `#ffffff` | Outer color of the two-color keyboard focus indicator. |
| `focus.ring.contrast` | `--sl-focus-ring-contrast` | color | `#ffffff` | `#0f172a` | Inner color of the two-color keyboard focus indicator. |
| `focus.ring.offset` | `--sl-focus-ring-offset` | dimension | `2px` | `2px` | Gap between a control and its focus ring. |
| `focus.ring.width` | `--sl-focus-ring-width` | dimension | `3px` | `3px` | Focus outline thickness. |

### surface

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `surface.bg` | `--sl-surface-bg` | color | `#ffffff` | `#0f172a` | Theme canvas background. |
| `surface.fg` | `--sl-surface-fg` | color | `#0f172a` | `#f8fafc` | Theme canvas foreground. |

## Primitive tokens

Primitives are not CSS variables. They exist so semantic tokens can
alias a stable palette before SLO-63 generates ramps.

| Token | Type | Value | Description |
| --- | --- | --- | --- |
| `color.blue.200` | color | `#bfdbfe` | Blue 200. |
| `color.blue.300` | color | `#93c5fd` | Blue 300. |
| `color.blue.400` | color | `#60a5fa` | Blue 400. |
| `color.blue.700` | color | `#1d4ed8` | Blue 700. |
| `color.blue.800` | color | `#1e40af` | Blue 800. |
| `color.blue.900` | color | `#1e3a8a` | Blue 900. |
| `color.red.200` | color | `#fecaca` | Red 200. |
| `color.red.300` | color | `#fca5a5` | Red 300. |
| `color.red.400` | color | `#f87171` | Red 400. |
| `color.red.700` | color | `#b91c1c` | Red 700. |
| `color.red.800` | color | `#991b1b` | Red 800. |
| `color.red.900` | color | `#7f1d1d` | Red 900. |
| `color.slate.100` | color | `#f1f5f9` | Slate 100. |
| `color.slate.200` | color | `#e2e8f0` | Slate 200. |
| `color.slate.300` | color | `#cbd5e1` | Slate 300. |
| `color.slate.50` | color | `#f8fafc` | Slate 50. |
| `color.slate.700` | color | `#334155` | Slate 700. |
| `color.slate.800` | color | `#1e293b` | Slate 800. |
| `color.slate.900` | color | `#0f172a` | Slate 900. |
| `color.white` | color | `#ffffff` | White. |
| `control.min.lg` | dimension | `3.25rem` | Large control minimum size. |
| `control.min.md` | dimension | `2.75rem` | Medium control minimum size. |
| `control.min.sm` | dimension | `2.25rem` | Small control minimum size. |
| `duration.fast` | duration | `120ms` | Fast interaction duration. |
| `font.weight.semibold` | fontWeight | `600` | Semibold font weight. |
| `opacity.disabled` | number | `0.55` | Unavailable-state opacity. |
| `radius.md` | dimension | `0.5rem` | Medium corner radius. |
| `size.focus.offset` | dimension | `2px` | Gap between a control and its focus ring. |
| `size.focus.width` | dimension | `3px` | Focus outline thickness. |
| `size.icon` | dimension | `1.1em` | Icon size relative to the label. |
| `size.spinner.width` | dimension | `2px` | Default spinner stroke width. |
| `space.2` | dimension | `0.5rem` | Space 2. |
| `space.3` | dimension | `0.75rem` | Space 3. |
| `space.3-5` | dimension | `0.875rem` | Space 3.5. |
| `space.4` | dimension | `1rem` | Space 4. |
| `space.5` | dimension | `1.25rem` | Space 5. |

