<!-- Generated from packages/themes/tokens. Do not edit by hand. -->

# Design token catalog

Compiled from DTCG JSON in `@ghostvue/themes`. Semantic tokens are the
public CSS custom properties (`--ghost-<role>-<part>-<state>`). Primitive
tokens are aliases for those values and are not published as CSS.
Override a semantic custom property on any subtree; `data-ghost-theme`,
`data-ghost-mode`, and `data-ghost-density` nest. Unset `data-ghost-mode` follows
`prefers-color-scheme`. Unset `data-ghost-density` is `comfortable`.
`--ghost-roundness` (0–1) scales every radius token from sharp to its
designed value (pill for `radius.pill`).

Default theme: `default`. Modes: `light`, `dark`. Densities: `compact`,
`comfortable` (default), `spacious`.

See [design tokens](../architecture/tokens.md) and
[ADR 0007](../adr/0007-token-pipeline.md).

## Color ramps

Twelve-step OKLCH palettes generated from brand seeds. Light-tuned and
dark-tuned ramps are independent; dark is not an inversion of light.
These primitives are not CSS variables — components consume semantic
tokens that alias them.

### neutral (light-tuned)

<div role="img" aria-label="neutral (light-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.neutral.50 #f9fafc" style="flex:1;background:#f9fafc;border-radius:0.2rem"></span><span title="color.neutral.100 #eceff3" style="flex:1;background:#eceff3;border-radius:0.2rem"></span><span title="color.neutral.200 #d9dee6" style="flex:1;background:#d9dee6;border-radius:0.2rem"></span><span title="color.neutral.300 #bcc4d1" style="flex:1;background:#bcc4d1;border-radius:0.2rem"></span><span title="color.neutral.400 #95a1b2" style="flex:1;background:#95a1b2;border-radius:0.2rem"></span><span title="color.neutral.500 #707e92" style="flex:1;background:#707e92;border-radius:0.2rem"></span><span title="color.neutral.600 #4f5d72" style="flex:1;background:#4f5d72;border-radius:0.2rem"></span><span title="color.neutral.700 #334155" style="flex:1;background:#334155;border-radius:0.2rem"></span><span title="color.neutral.800 #263243" style="flex:1;background:#263243;border-radius:0.2rem"></span><span title="color.neutral.900 #1a2330" style="flex:1;background:#1a2330;border-radius:0.2rem"></span><span title="color.neutral.950 #111720" style="flex:1;background:#111720;border-radius:0.2rem"></span><span title="color.neutral.1000 #070b11" style="flex:1;background:#070b11;border-radius:0.2rem"></span></div>

### neutral (dark-tuned)

<div role="img" aria-label="neutral (dark-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.neutral.dark.50 #f0f2f5" style="flex:1;background:#f0f2f5;border-radius:0.2rem"></span><span title="color.neutral.dark.100 #e8ecf1" style="flex:1;background:#e8ecf1;border-radius:0.2rem"></span><span title="color.neutral.dark.200 #dee4eb" style="flex:1;background:#dee4eb;border-radius:0.2rem"></span><span title="color.neutral.dark.300 #d3dce7" style="flex:1;background:#d3dce7;border-radius:0.2rem"></span><span title="color.neutral.dark.400 #cbd5e1" style="flex:1;background:#cbd5e1;border-radius:0.2rem"></span><span title="color.neutral.dark.500 #a3adb9" style="flex:1;background:#a3adb9;border-radius:0.2rem"></span><span title="color.neutral.dark.600 #7f8790" style="flex:1;background:#7f8790;border-radius:0.2rem"></span><span title="color.neutral.dark.700 #60666e" style="flex:1;background:#60666e;border-radius:0.2rem"></span><span title="color.neutral.dark.800 #464b50" style="flex:1;background:#464b50;border-radius:0.2rem"></span><span title="color.neutral.dark.900 #2e3135" style="flex:1;background:#2e3135;border-radius:0.2rem"></span><span title="color.neutral.dark.950 #1b1d1f" style="flex:1;background:#1b1d1f;border-radius:0.2rem"></span><span title="color.neutral.dark.1000 #0c0d0f" style="flex:1;background:#0c0d0f;border-radius:0.2rem"></span></div>

### primary (light-tuned)

<div role="img" aria-label="primary (light-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.primary.50 #f8faff" style="flex:1;background:#f8faff;border-radius:0.2rem"></span><span title="color.primary.100 #eaf1ff" style="flex:1;background:#eaf1ff;border-radius:0.2rem"></span><span title="color.primary.200 #d6e3ff" style="flex:1;background:#d6e3ff;border-radius:0.2rem"></span><span title="color.primary.300 #b6ceff" style="flex:1;background:#b6ceff;border-radius:0.2rem"></span><span title="color.primary.400 #89afff" style="flex:1;background:#89afff;border-radius:0.2rem"></span><span title="color.primary.500 #5b8dff" style="flex:1;background:#5b8dff;border-radius:0.2rem"></span><span title="color.primary.600 #356af3" style="flex:1;background:#356af3;border-radius:0.2rem"></span><span title="color.primary.700 #1d4ed8" style="flex:1;background:#1d4ed8;border-radius:0.2rem"></span><span title="color.primary.800 #0d35ae" style="flex:1;background:#0d35ae;border-radius:0.2rem"></span><span title="color.primary.900 #05217d" style="flex:1;background:#05217d;border-radius:0.2rem"></span><span title="color.primary.950 #021350" style="flex:1;background:#021350;border-radius:0.2rem"></span><span title="color.primary.1000 #00052d" style="flex:1;background:#00052d;border-radius:0.2rem"></span></div>

### primary (dark-tuned)

<div role="img" aria-label="primary (dark-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.primary.dark.50 #e9f3ff" style="flex:1;background:#e9f3ff;border-radius:0.2rem"></span><span title="color.primary.dark.100 #cde3ff" style="flex:1;background:#cde3ff;border-radius:0.2rem"></span><span title="color.primary.dark.200 #a8ceff" style="flex:1;background:#a8ceff;border-radius:0.2rem"></span><span title="color.primary.dark.300 #80b8ff" style="flex:1;background:#80b8ff;border-radius:0.2rem"></span><span title="color.primary.dark.400 #60a5fa" style="flex:1;background:#60a5fa;border-radius:0.2rem"></span><span title="color.primary.dark.500 #4286d9" style="flex:1;background:#4286d9;border-radius:0.2rem"></span><span title="color.primary.dark.600 #2f69af" style="flex:1;background:#2f69af;border-radius:0.2rem"></span><span title="color.primary.dark.700 #235187" style="flex:1;background:#235187;border-radius:0.2rem"></span><span title="color.primary.dark.800 #1c3d64" style="flex:1;background:#1c3d64;border-radius:0.2rem"></span><span title="color.primary.dark.900 #132944" style="flex:1;background:#132944;border-radius:0.2rem"></span><span title="color.primary.dark.950 #0c1a2b" style="flex:1;background:#0c1a2b;border-radius:0.2rem"></span><span title="color.primary.dark.1000 #050e19" style="flex:1;background:#050e19;border-radius:0.2rem"></span></div>

### success (light-tuned)

<div role="img" aria-label="success (light-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.success.50 #f5fcf6" style="flex:1;background:#f5fcf6;border-radius:0.2rem"></span><span title="color.success.100 #e8f6ea" style="flex:1;background:#e8f6ea;border-radius:0.2rem"></span><span title="color.success.200 #d1eed6" style="flex:1;background:#d1eed6;border-radius:0.2rem"></span><span title="color.success.300 #b1dfb9" style="flex:1;background:#b1dfb9;border-radius:0.2rem"></span><span title="color.success.400 #87c895" style="flex:1;background:#87c895;border-radius:0.2rem"></span><span title="color.success.500 #5fb073" style="flex:1;background:#5fb073;border-radius:0.2rem"></span><span title="color.success.600 #389754" style="flex:1;background:#389754;border-radius:0.2rem"></span><span title="color.success.700 #15803d" style="flex:1;background:#15803d;border-radius:0.2rem"></span><span title="color.success.800 #006029" style="flex:1;background:#006029;border-radius:0.2rem"></span><span title="color.success.900 #004019" style="flex:1;background:#004019;border-radius:0.2rem"></span><span title="color.success.950 #00270c" style="flex:1;background:#00270c;border-radius:0.2rem"></span><span title="color.success.1000 #001003" style="flex:1;background:#001003;border-radius:0.2rem"></span></div>

### success (dark-tuned)

<div role="img" aria-label="success (dark-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.success.dark.50 #dffae5" style="flex:1;background:#dffae5;border-radius:0.2rem"></span><span title="color.success.dark.100 #c4f6cf" style="flex:1;background:#c4f6cf;border-radius:0.2rem"></span><span title="color.success.dark.200 #9feeb3" style="flex:1;background:#9feeb3;border-radius:0.2rem"></span><span title="color.success.dark.300 #6ee794" style="flex:1;background:#6ee794;border-radius:0.2rem"></span><span title="color.success.dark.400 #4ade80" style="flex:1;background:#4ade80;border-radius:0.2rem"></span><span title="color.success.dark.500 #00b95d" style="flex:1;background:#00b95d;border-radius:0.2rem"></span><span title="color.success.dark.600 #009148" style="flex:1;background:#009148;border-radius:0.2rem"></span><span title="color.success.dark.700 #006f35" style="flex:1;background:#006f35;border-radius:0.2rem"></span><span title="color.success.dark.800 #045227" style="flex:1;background:#045227;border-radius:0.2rem"></span><span title="color.success.dark.900 #06371a" style="flex:1;background:#06371a;border-radius:0.2rem"></span><span title="color.success.dark.950 #05220f" style="flex:1;background:#05220f;border-radius:0.2rem"></span><span title="color.success.dark.1000 #021206" style="flex:1;background:#021206;border-radius:0.2rem"></span></div>

### warning (light-tuned)

<div role="img" aria-label="warning (light-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.warning.50 #fff9f5" style="flex:1;background:#fff9f5;border-radius:0.2rem"></span><span title="color.warning.100 #ffeee6" style="flex:1;background:#ffeee6;border-radius:0.2rem"></span><span title="color.warning.200 #ffdfce" style="flex:1;background:#ffdfce;border-radius:0.2rem"></span><span title="color.warning.300 #fec6a8" style="flex:1;background:#fec6a8;border-radius:0.2rem"></span><span title="color.warning.400 #f1a67d" style="flex:1;background:#f1a67d;border-radius:0.2rem"></span><span title="color.warning.500 #e08755" style="flex:1;background:#e08755;border-radius:0.2rem"></span><span title="color.warning.600 #cb6a2e" style="flex:1;background:#cb6a2e;border-radius:0.2rem"></span><span title="color.warning.700 #b45309" style="flex:1;background:#b45309;border-radius:0.2rem"></span><span title="color.warning.800 #873b00" style="flex:1;background:#873b00;border-radius:0.2rem"></span><span title="color.warning.900 #5b2600" style="flex:1;background:#5b2600;border-radius:0.2rem"></span><span title="color.warning.950 #381400" style="flex:1;background:#381400;border-radius:0.2rem"></span><span title="color.warning.1000 #180500" style="flex:1;background:#180500;border-radius:0.2rem"></span></div>

### warning (dark-tuned)

<div role="img" aria-label="warning (dark-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.warning.dark.50 #fdf0d7" style="flex:1;background:#fdf0d7;border-radius:0.2rem"></span><span title="color.warning.dark.100 #fee7b8" style="flex:1;background:#fee7b8;border-radius:0.2rem"></span><span title="color.warning.dark.200 #fed98e" style="flex:1;background:#fed98e;border-radius:0.2rem"></span><span title="color.warning.dark.300 #ffcb56" style="flex:1;background:#ffcb56;border-radius:0.2rem"></span><span title="color.warning.dark.400 #fbbf24" style="flex:1;background:#fbbf24;border-radius:0.2rem"></span><span title="color.warning.dark.500 #ce9a00" style="flex:1;background:#ce9a00;border-radius:0.2rem"></span><span title="color.warning.dark.600 #a17800" style="flex:1;background:#a17800;border-radius:0.2rem"></span><span title="color.warning.dark.700 #7b5b00" style="flex:1;background:#7b5b00;border-radius:0.2rem"></span><span title="color.warning.dark.800 #5c4300" style="flex:1;background:#5c4300;border-radius:0.2rem"></span><span title="color.warning.dark.900 #3e2c00" style="flex:1;background:#3e2c00;border-radius:0.2rem"></span><span title="color.warning.dark.950 #261a00" style="flex:1;background:#261a00;border-radius:0.2rem"></span><span title="color.warning.dark.1000 #140c00" style="flex:1;background:#140c00;border-radius:0.2rem"></span></div>

### danger (light-tuned)

<div role="img" aria-label="danger (light-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.danger.50 #fff8f7" style="flex:1;background:#fff8f7;border-radius:0.2rem"></span><span title="color.danger.100 #ffecea" style="flex:1;background:#ffecea;border-radius:0.2rem"></span><span title="color.danger.200 #ffdad5" style="flex:1;background:#ffdad5;border-radius:0.2rem"></span><span title="color.danger.300 #ffbcb3" style="flex:1;background:#ffbcb3;border-radius:0.2rem"></span><span title="color.danger.400 #fe8e82" style="flex:1;background:#fe8e82;border-radius:0.2rem"></span><span title="color.danger.500 #ec675b" style="flex:1;background:#ec675b;border-radius:0.2rem"></span><span title="color.danger.600 #d44038" style="flex:1;background:#d44038;border-radius:0.2rem"></span><span title="color.danger.700 #b91c1c" style="flex:1;background:#b91c1c;border-radius:0.2rem"></span><span title="color.danger.800 #900009" style="flex:1;background:#900009;border-radius:0.2rem"></span><span title="color.danger.900 #640004" style="flex:1;background:#640004;border-radius:0.2rem"></span><span title="color.danger.950 #400002" style="flex:1;background:#400002;border-radius:0.2rem"></span><span title="color.danger.1000 #1f0000" style="flex:1;background:#1f0000;border-radius:0.2rem"></span></div>

### danger (dark-tuned)

<div role="img" aria-label="danger (dark-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.danger.dark.50 #ffedec" style="flex:1;background:#ffedec;border-radius:0.2rem"></span><span title="color.danger.dark.100 #ffd5d3" style="flex:1;background:#ffd5d3;border-radius:0.2rem"></span><span title="color.danger.dark.200 #ffb4b0" style="flex:1;background:#ffb4b0;border-radius:0.2rem"></span><span title="color.danger.dark.300 #ff908d" style="flex:1;background:#ff908d;border-radius:0.2rem"></span><span title="color.danger.dark.400 #f87171" style="flex:1;background:#f87171;border-radius:0.2rem"></span><span title="color.danger.dark.500 #d65255" style="flex:1;background:#d65255;border-radius:0.2rem"></span><span title="color.danger.dark.600 #ac3c3f" style="flex:1;background:#ac3c3f;border-radius:0.2rem"></span><span title="color.danger.dark.700 #852e30" style="flex:1;background:#852e30;border-radius:0.2rem"></span><span title="color.danger.dark.800 #632425" style="flex:1;background:#632425;border-radius:0.2rem"></span><span title="color.danger.dark.900 #441919" style="flex:1;background:#441919;border-radius:0.2rem"></span><span title="color.danger.dark.950 #2b0f0f" style="flex:1;background:#2b0f0f;border-radius:0.2rem"></span><span title="color.danger.dark.1000 #190707" style="flex:1;background:#190707;border-radius:0.2rem"></span></div>

### info (light-tuned)

<div role="img" aria-label="info (light-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.info.50 #f6fbff" style="flex:1;background:#f6fbff;border-radius:0.2rem"></span><span title="color.info.100 #e7f3fd" style="flex:1;background:#e7f3fd;border-radius:0.2rem"></span><span title="color.info.200 #cfe7fc" style="flex:1;background:#cfe7fc;border-radius:0.2rem"></span><span title="color.info.300 #acd4f5" style="flex:1;background:#acd4f5;border-radius:0.2rem"></span><span title="color.info.400 #81b9e5" style="flex:1;background:#81b9e5;border-radius:0.2rem"></span><span title="color.info.500 #579dd1" style="flex:1;background:#579dd1;border-radius:0.2rem"></span><span title="color.info.600 #2f82ba" style="flex:1;background:#2f82ba;border-radius:0.2rem"></span><span title="color.info.700 #0369a1" style="flex:1;background:#0369a1;border-radius:0.2rem"></span><span title="color.info.800 #004e7a" style="flex:1;background:#004e7a;border-radius:0.2rem"></span><span title="color.info.900 #003454" style="flex:1;background:#003454;border-radius:0.2rem"></span><span title="color.info.950 #001f35" style="flex:1;background:#001f35;border-radius:0.2rem"></span><span title="color.info.1000 #000c19" style="flex:1;background:#000c19;border-radius:0.2rem"></span></div>

### info (dark-tuned)

<div role="img" aria-label="info (dark-tuned) ramp" style="display:flex;height:2.25rem;gap:0.15rem;margin:0.35rem 0 0.85rem;"><span title="color.info.dark.50 #e3f5ff" style="flex:1;background:#e3f5ff;border-radius:0.2rem"></span><span title="color.info.dark.100 #c5eaff" style="flex:1;background:#c5eaff;border-radius:0.2rem"></span><span title="color.info.dark.200 #99dbff" style="flex:1;background:#99dbff;border-radius:0.2rem"></span><span title="color.info.dark.300 #65ccff" style="flex:1;background:#65ccff;border-radius:0.2rem"></span><span title="color.info.dark.400 #38bdf8" style="flex:1;background:#38bdf8;border-radius:0.2rem"></span><span title="color.info.dark.500 #009bd2" style="flex:1;background:#009bd2;border-radius:0.2rem"></span><span title="color.info.dark.600 #007aa6" style="flex:1;background:#007aa6;border-radius:0.2rem"></span><span title="color.info.dark.700 #005d80" style="flex:1;background:#005d80;border-radius:0.2rem"></span><span title="color.info.dark.800 #004661" style="flex:1;background:#004661;border-radius:0.2rem"></span><span title="color.info.dark.900 #042f42" style="flex:1;background:#042f42;border-radius:0.2rem"></span><span title="color.info.dark.950 #041d29" style="flex:1;background:#041d29;border-radius:0.2rem"></span><span title="color.info.dark.1000 #020f17" style="flex:1;background:#020f17;border-radius:0.2rem"></span></div>

## Semantic tokens

### action

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `action.danger.bg` | `--ghost-action-danger-bg` | color | `#b91c1c` | `#f87171` | Solid danger action background. |
| `action.danger.bg.active` | `--ghost-action-danger-bg-active` | color | `#640004` | `#ffb4b0` | Solid danger action background on press. |
| `action.danger.bg.hover` | `--ghost-action-danger-bg-hover` | color | `#900009` | `#ff908d` | Solid danger action background on hover. |
| `action.danger.border` | `--ghost-action-danger-border` | color | `#b91c1c` | `#f87171` | Border on a solid danger action. |
| `action.danger.fg` | `--ghost-action-danger-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid danger action. |
| `action.danger.gradient.from` | `--ghost-action-danger-gradient-from` | color | `#b91c1c` | `#f87171` | Danger action gradient start. Must meet WCAG AA with action.danger.fg. |
| `action.danger.gradient.to` | `--ghost-action-danger-gradient-to` | color | `#900009` | `#ff908d` | Danger action gradient end. Must meet WCAG AA with action.danger.fg. |
| `action.disabled.bg` | `--ghost-action-disabled-bg` | color | `#d9dee6` | `#464b50` | Unavailable action background. Desaturated; still meets WCAG AA with action.disabled.fg. |
| `action.disabled.border` | `--ghost-action-disabled-border` | color | `#bcc4d1` | `#60666e` | Unavailable action border. |
| `action.disabled.fg` | `--ghost-action-disabled-fg` | color | `#334155` | `#d3dce7` | Unavailable action foreground. Reduced emphasis, still legible. |
| `action.disabled.opacity` | `--ghost-action-disabled-opacity` | number | `0.55` | `0.55` | Shared unavailable-state opacity. GhostButton uses dedicated disabled colors instead of fading the rest tone. |
| `action.duration` | `--ghost-action-duration` | duration | `120ms` | `120ms` | Action color and opacity transition duration. |
| `action.gap` | `--ghost-action-gap` | dimension | `0.5rem` | `0.5rem` | Space between action label and icon content. |
| `action.highlight` | `--ghost-action-highlight` | shadow | `inset 0px 1px 0px 0px oklch(1 0.012 258 / 0.28)` | `inset 0px 1px 0px 0px oklch(1 0.005 258 / 0.12)` | Inset top sheen on solid actions. |
| `action.icon.size` | `--ghost-action-icon-size` | dimension | `1.1em` | `1.1em` | Action icon size. |
| `action.info.bg` | `--ghost-action-info-bg` | color | `#0369a1` | `#38bdf8` | Solid info action background. |
| `action.info.bg.active` | `--ghost-action-info-bg-active` | color | `#003454` | `#99dbff` | Solid info action background on press. |
| `action.info.bg.hover` | `--ghost-action-info-bg-hover` | color | `#004e7a` | `#65ccff` | Solid info action background on hover. |
| `action.info.border` | `--ghost-action-info-border` | color | `#0369a1` | `#38bdf8` | Border on a solid info action. |
| `action.info.fg` | `--ghost-action-info-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid info action. |
| `action.label.family` | `--ghost-action-label-family` | fontFamily | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` | Action label font family. |
| `action.label.letter` | `--ghost-action-label-letter` | letterSpacing | `0em` | `0em` | Action label letter-spacing. |
| `action.label.line` | `--ghost-action-label-line` | number | `1.2` | `1.2` | Action label line-height. |
| `action.label.size` | `--ghost-action-label-size` | fontSize | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | Default action label size. Size variants use control.size.*.font. |
| `action.label.weight` | `--ghost-action-label-weight` | fontWeight | `600` | `600` | Action label font weight. |
| `action.neutral.bg` | `--ghost-action-neutral-bg` | color | `#334155` | `#cbd5e1` | Solid neutral action background. |
| `action.neutral.bg.active` | `--ghost-action-neutral-bg-active` | color | `#1a2330` | `#dee4eb` | Solid neutral action background on press. |
| `action.neutral.bg.hover` | `--ghost-action-neutral-bg-hover` | color | `#263243` | `#d3dce7` | Solid neutral action background on hover. |
| `action.neutral.border` | `--ghost-action-neutral-border` | color | `#334155` | `#cbd5e1` | Border on a solid neutral action. |
| `action.neutral.fg` | `--ghost-action-neutral-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid neutral action. |
| `action.neutral.gradient.from` | `--ghost-action-neutral-gradient-from` | color | `#334155` | `#cbd5e1` | Neutral action gradient start. Must meet WCAG AA with action.neutral.fg. |
| `action.neutral.gradient.to` | `--ghost-action-neutral-gradient-to` | color | `#263243` | `#d3dce7` | Neutral action gradient end. Must meet WCAG AA with action.neutral.fg. |
| `action.primary.bg` | `--ghost-action-primary-bg` | color | `#1d4ed8` | `#60a5fa` | Solid primary action background. Maps to GhostButton tone accent. |
| `action.primary.bg.active` | `--ghost-action-primary-bg-active` | color | `#05217d` | `#a8ceff` | Solid primary action background on press. |
| `action.primary.bg.hover` | `--ghost-action-primary-bg-hover` | color | `#0d35ae` | `#80b8ff` | Solid primary action background on hover. |
| `action.primary.border` | `--ghost-action-primary-border` | color | `#1d4ed8` | `#60a5fa` | Border on a solid primary action. |
| `action.primary.fg` | `--ghost-action-primary-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid primary action. |
| `action.primary.gradient.from` | `--ghost-action-primary-gradient-from` | color | `#1d4ed8` | `#60a5fa` | Primary action gradient start. Must meet WCAG AA with action.primary.fg. |
| `action.primary.gradient.to` | `--ghost-action-primary-gradient-to` | color | `#004e7a` | `#38bdf8` | Primary action gradient end. Subtle hue shift; must meet WCAG AA with action.primary.fg. |
| `action.radius` | `--ghost-action-radius` | dimension | `0.5rem` | `0.5rem` | Action corner radius. Follows --ghost-roundness. |
| `action.shadow` | `--ghost-action-shadow` | shadow | `0px 2px 4px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 4px 10px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 2px 4px 0px oklch(0.08 0.02 258 / 0.3), 0px 3px 8px 0px oklch(0.08 0.02 258 / 0.18)` | Rest elevation on solid actions. |
| `action.shadow.press` | `--ghost-action-shadow-press` | shadow | `0px 1px 2px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 1px 3px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 1px 2px 0px oklch(0.08 0.02 258 / 0.28), 0px 1px 2px 0px oklch(0.08 0.02 258 / 0.16)` | Compressed elevation on a pressed solid action. |
| `action.spinner.duration` | `--ghost-action-spinner-duration` | duration | `700ms` | `700ms` | Default action spinner rotation period. The reduced-motion pulse uses the same period so it does not flicker. |
| `action.spinner.opacity` | `--ghost-action-spinner-opacity` | number | `0.35` | `0.35` | Reduced-motion spinner pulse trough opacity. |
| `action.spinner.size` | `--ghost-action-spinner-size` | dimension | `1.1em` | `1.1em` | Action loading-indicator size. |
| `action.spinner.width` | `--ghost-action-spinner-width` | dimension | `2px` | `2px` | Default action spinner stroke width. |
| `action.success.bg` | `--ghost-action-success-bg` | color | `#15803d` | `#4ade80` | Solid success action background. |
| `action.success.bg.active` | `--ghost-action-success-bg-active` | color | `#004019` | `#9feeb3` | Solid success action background on press. |
| `action.success.bg.hover` | `--ghost-action-success-bg-hover` | color | `#006029` | `#6ee794` | Solid success action background on hover. |
| `action.success.border` | `--ghost-action-success-border` | color | `#15803d` | `#4ade80` | Border on a solid success action. |
| `action.success.fg` | `--ghost-action-success-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid success action. |
| `action.warning.bg` | `--ghost-action-warning-bg` | color | `#873b00` | `#fbbf24` | Solid warning action background. Uses 800 so white label text meets WCAG AA. |
| `action.warning.bg.active` | `--ghost-action-warning-bg-active` | color | `#381400` | `#fed98e` | Solid warning action background on press. |
| `action.warning.bg.hover` | `--ghost-action-warning-bg-hover` | color | `#5b2600` | `#ffcb56` | Solid warning action background on hover. |
| `action.warning.border` | `--ghost-action-warning-border` | color | `#873b00` | `#fbbf24` | Border on a solid warning action. |
| `action.warning.fg` | `--ghost-action-warning-fg` | color | `#ffffff` | `#0f172a` | Content color on a solid warning action. |

### border

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `border.danger` | `--ghost-border-danger` | color | `#b91c1c` | `#f87171` | Danger-accent border. |
| `border.default` | `--ghost-border-default` | color | `#bcc4d1` | `#60666e` | Default structural border. |
| `border.focus` | `--ghost-border-focus` | color | `#0f172a` | `#ffffff` | Focus-indicator border. |
| `border.hairline` | `--ghost-border-hairline` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Alpha hairline border color. |
| `border.hairline.width` | `--ghost-border-hairline-width` | dimension | `1px` | `1px` | Hairline width. 1px at 1x, 0.5px on high-DPR screens. |
| `border.info` | `--ghost-border-info` | color | `#0369a1` | `#38bdf8` | Info-accent border. |
| `border.muted` | `--ghost-border-muted` | color | `#d9dee6` | `#464b50` | Low-emphasis border. |
| `border.primary` | `--ghost-border-primary` | color | `#1d4ed8` | `#60a5fa` | Primary-accent border. |
| `border.strong` | `--ghost-border-strong` | color | `#707e92` | `#a3adb9` | High-emphasis border. |
| `border.success` | `--ghost-border-success` | color | `#15803d` | `#4ade80` | Success-accent border. |
| `border.warning` | `--ghost-border-warning` | color | `#b45309` | `#fbbf24` | Warning-accent border. |

### control

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `control.size.lg.font` | `--ghost-control-size-lg-font` | fontSize | `clamp(1.0625rem, 1.0417rem + 0.1042vw, 1.125rem)` | `clamp(1.0625rem, 1.0417rem + 0.1042vw, 1.125rem)` | Large control font size. |
| `control.size.lg.min` | `--ghost-control-size-lg-min` | dimension | `3rem` | `3rem` | Large control minimum block size. Comfortable and spacious 48px; compact 40. |
| `control.size.lg.padding.block` | `--ghost-control-size-lg-padding-block` | dimension | `1rem` | `1rem` | Large control block padding. |
| `control.size.lg.padding.inline` | `--ghost-control-size-lg-padding-inline` | dimension | `1.25rem` | `1.25rem` | Large control inline padding. |
| `control.size.md.font` | `--ghost-control-size-md-font` | fontSize | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | Medium control font size. |
| `control.size.md.min` | `--ghost-control-size-md-min` | dimension | `2.5rem` | `2.5rem` | Medium control minimum block size. Comfortable 40px; compact 32; spacious 48. |
| `control.size.md.padding.block` | `--ghost-control-size-md-padding-block` | dimension | `0.75rem` | `0.75rem` | Medium control block padding. |
| `control.size.md.padding.inline` | `--ghost-control-size-md-padding-inline` | dimension | `1rem` | `1rem` | Medium control inline padding. |
| `control.size.sm.font` | `--ghost-control-size-sm-font` | fontSize | `clamp(0.8125rem, 0.7917rem + 0.1042vw, 0.875rem)` | `clamp(0.8125rem, 0.7917rem + 0.1042vw, 0.875rem)` | Small control font size. |
| `control.size.sm.min` | `--ghost-control-size-sm-min` | dimension | `2rem` | `2rem` | Small control minimum block size. Comfortable 32px; compact 28; spacious 36. |
| `control.size.sm.padding.block` | `--ghost-control-size-sm-padding-block` | dimension | `0.5rem` | `0.5rem` | Small control block padding. |
| `control.size.sm.padding.inline` | `--ghost-control-size-sm-padding-inline` | dimension | `0.75rem` | `0.75rem` | Small control inline padding. |
| `control.touch.min` | `--ghost-control-touch-min` | dimension | `2.75rem` | `2.75rem` | Coarse-pointer floor applied to control heights. |

### elevation

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `elevation.0.bg` | `--ghost-elevation-0-bg` | color | `#ffffff` | `#0f172a` | Level 0 surface. Flush with the canvas. |
| `elevation.0.border` | `--ghost-elevation-0-border` | color | `transparent` | `transparent` | Level 0 border. Flush surfaces do not stroke. |
| `elevation.0.highlight` | `--ghost-elevation-0-highlight` | shadow | `inset 0px 1px 0px 0px transparent` | `inset 0px 1px 0px 0px transparent` | Level 0 inset highlight. Unused in light mode. |
| `elevation.0.shadow` | `--ghost-elevation-0-shadow` | shadow | `0px 0px 0px 0px transparent` | `0px 0px 0px 0px transparent` | Level 0 shadow. No ambient or key layer. |
| `elevation.1.bg` | `--ghost-elevation-1-bg` | color | `#ffffff` | `#1b1d1f` | Level 1 surface. Resting cards and controls. |
| `elevation.1.border` | `--ghost-elevation-1-border` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Level 1 hairline border. |
| `elevation.1.highlight` | `--ghost-elevation-1-highlight` | shadow | `inset 0px 1px 0px 0px transparent` | `inset 0px 1px 0px 0px oklch(1 0.005 258 / 0.12)` | Level 1 inset highlight. Unused in light mode. |
| `elevation.1.shadow` | `--ghost-elevation-1-shadow` | shadow | `0px 1px 2px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 1px 3px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 1px 2px 0px oklch(0.08 0.02 258 / 0.28), 0px 1px 2px 0px oklch(0.08 0.02 258 / 0.16)` | Level 1 layered shadow. Ambient plus key light. |
| `elevation.2.bg` | `--ghost-elevation-2-bg` | color | `#ffffff` | `#24272b` | Level 2 surface. Raised cards and menus. |
| `elevation.2.border` | `--ghost-elevation-2-border` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Level 2 hairline border. |
| `elevation.2.highlight` | `--ghost-elevation-2-highlight` | shadow | `inset 0px 1px 0px 0px transparent` | `inset 0px 1px 0px 0px oklch(1 0.005 258 / 0.12)` | Level 2 inset highlight. Unused in light mode. |
| `elevation.2.shadow` | `--ghost-elevation-2-shadow` | shadow | `0px 2px 4px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 4px 10px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 2px 4px 0px oklch(0.08 0.02 258 / 0.3), 0px 3px 8px 0px oklch(0.08 0.02 258 / 0.18)` | Level 2 layered shadow. Ambient plus key light. |
| `elevation.3.bg` | `--ghost-elevation-3-bg` | color | `#ffffff` | `#2e3135` | Level 3 surface. Popovers and floating panels. |
| `elevation.3.border` | `--ghost-elevation-3-border` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Level 3 hairline border. |
| `elevation.3.highlight` | `--ghost-elevation-3-highlight` | shadow | `inset 0px 1px 0px 0px transparent` | `inset 0px 1px 0px 0px oklch(1 0.005 258 / 0.12)` | Level 3 inset highlight. Unused in light mode. |
| `elevation.3.shadow` | `--ghost-elevation-3-shadow` | shadow | `0px 4px 8px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 8px 20px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 4px 8px 0px oklch(0.08 0.02 258 / 0.32), 0px 6px 16px 0px oklch(0.08 0.02 258 / 0.2)` | Level 3 layered shadow. Ambient plus key light. |
| `elevation.4.bg` | `--ghost-elevation-4-bg` | color | `#ffffff` | `#3a3e43` | Level 4 surface. Dialogs and sheets. |
| `elevation.4.border` | `--ghost-elevation-4-border` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Level 4 hairline border. |
| `elevation.4.highlight` | `--ghost-elevation-4-highlight` | shadow | `inset 0px 1px 0px 0px transparent` | `inset 0px 1px 0px 0px oklch(1 0.005 258 / 0.12)` | Level 4 inset highlight. Unused in light mode. |
| `elevation.4.shadow` | `--ghost-elevation-4-shadow` | shadow | `0px 8px 16px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 16px 32px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 6px 12px 0px oklch(0.08 0.02 258 / 0.34), 0px 10px 24px 0px oklch(0.08 0.02 258 / 0.22)` | Level 4 layered shadow. Ambient plus key light. |
| `elevation.5.bg` | `--ghost-elevation-5-bg` | color | `#ffffff` | `#464b50` | Level 5 surface. Highest floating layer. |
| `elevation.5.border` | `--ghost-elevation-5-border` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Level 5 hairline border. |
| `elevation.5.highlight` | `--ghost-elevation-5-highlight` | shadow | `inset 0px 1px 0px 0px transparent` | `inset 0px 1px 0px 0px oklch(1 0.005 258 / 0.12)` | Level 5 inset highlight. Unused in light mode. |
| `elevation.5.shadow` | `--ghost-elevation-5-shadow` | shadow | `0px 12px 24px 0px oklch(0.254 0.028 257.5 / 0.08), 0px 24px 48px 0px oklch(0.254 0.028 257.5 / 0.14)` | `0px 8px 16px 0px oklch(0.08 0.02 258 / 0.36), 0px 14px 32px 0px oklch(0.08 0.02 258 / 0.24)` | Level 5 layered shadow. Ambient plus key light. |

### focus

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `focus.ring.color` | `--ghost-focus-ring-color` | color | `#0f172a` | `#ffffff` | Outer color of the two-color keyboard focus indicator. |
| `focus.ring.contrast` | `--ghost-focus-ring-contrast` | color | `#ffffff` | `#0f172a` | Inner color of the two-color keyboard focus indicator. |
| `focus.ring.duration` | `--ghost-focus-ring-duration` | duration | `120ms` | `120ms` | Focus-ring entrance duration. Instant under reduced motion. |
| `focus.ring.offset` | `--ghost-focus-ring-offset` | dimension | `2px` | `2px` | Gap between a control and its focus ring. |
| `focus.ring.width` | `--ghost-focus-ring-width` | dimension | `3px` | `3px` | Focus outline thickness. |

### gradient

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `gradient.accent` | `--ghost-gradient-accent` | gradient | `linear-gradient(135deg in oklch, #356af3 0%, #579dd1 100%)` | `linear-gradient(135deg in oklch, #60a5fa 0%, #38bdf8 100%)` | Accent gradient interpolated in oklch. |
| `gradient.action.danger` | `--ghost-gradient-action-danger` | gradient | `linear-gradient(165deg in oklch, #b91c1c 0%, #900009 100%)` | `linear-gradient(165deg in oklch, #f87171 0%, #ff908d 100%)` | Solid danger action fill. Interpolated in oklch; both stops meet WCAG AA with action.danger.fg. |
| `gradient.action.neutral` | `--ghost-gradient-action-neutral` | gradient | `linear-gradient(165deg in oklch, #334155 0%, #263243 100%)` | `linear-gradient(165deg in oklch, #cbd5e1 0%, #d3dce7 100%)` | Solid neutral action fill. Interpolated in oklch; both stops meet WCAG AA with action.neutral.fg. |
| `gradient.action.primary` | `--ghost-gradient-action-primary` | gradient | `linear-gradient(165deg in oklch, #1d4ed8 0%, #004e7a 100%)` | `linear-gradient(165deg in oklch, #60a5fa 0%, #38bdf8 100%)` | Solid primary action fill. Interpolated in oklch; both stops meet WCAG AA with action.primary.fg. |
| `gradient.aurora` | `--ghost-gradient-aurora` | gradient | `radial-gradient(in oklch at 14% 18%, #d6e3ff 0%, transparent 52%), radial-gradient(in oklch at 86% 12%, #cfe7fc 0%, transparent 48%), radial-gradient(in oklch at 62% 92%, #e8f6ea 0%, transparent 55%)` | `radial-gradient(in oklch at 14% 18%, #235187 0%, transparent 52%), radial-gradient(in oklch at 86% 12%, #005d80 0%, transparent 48%), radial-gradient(in oklch at 62% 92%, #045227 0%, transparent 55%)` | Layered radial aurora background interpolated in oklch. |
| `gradient.border` | `--ghost-gradient-border` | gradient | `linear-gradient(135deg in oklch, #356af3 0%, #579dd1 100%)` | `linear-gradient(135deg in oklch, #60a5fa 0%, #38bdf8 100%)` | Gradient used by the gradient-border mask recipe. |

### interactive

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `interactive.leave.spring` | `--ghost-interactive-leave-spring` | spring | `linear(0, 0.0043 0.8264%, 0.036 2.4793%, 0.1271 4.9587%, 0.6578 14.876%, 0.8392 19.0083%, 0.9867 23.9669%, 1.0328 26.4463%, 1.063 28.9256%, 1.0832 32.2314%, 1.0853 36.3636%, 1.0164 52.8926%, 0.9952 62.8099%, 1)` | `linear(0, 0.0043 0.8264%, 0.036 2.4793%, 0.1271 4.9587%, 0.6578 14.876%, 0.8392 19.0083%, 0.9867 23.9669%, 1.0328 26.4463%, 1.063 28.9256%, 1.0832 32.2314%, 1.0853 36.3636%, 1.0164 52.8926%, 0.9952 62.8099%, 1)` | Leave-settle easing for pointer-reactive surfaces. |
| `interactive.leave.spring.duration` | `--ghost-interactive-leave-spring-duration` | duration | `504ms` | `504ms` | Settle duration when a pointer-reactive surface returns to rest. |
| `interactive.spotlight.color` | `--ghost-interactive-spotlight-color` | color | `#1d4ed8` | `#60a5fa` | Spotlight glow color. Mono hairline uses chroma-0 primary through this alias. |
| `interactive.spotlight.opacity` | `--ghost-interactive-spotlight-opacity` | number | `0.28` | `0.28` | Peak spotlight opacity before --ghost-motion-intensity. 0 hides the glow. |
| `interactive.spotlight.size` | `--ghost-interactive-spotlight-size` | dimension | `10rem` | `10rem` | Spotlight glow diameter. Subtle default; defineTheme interactivity resizes it. |

### material

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `material.glass.bg` | `--ghost-material-glass-bg` | color | `oklch(1 0 0 / 0.64)` | `oklch(0.27 0.018 258 / 0.55)` | Translucent glass fill. Contrast is gated on the opaque fallback. |
| `material.glass.blur` | `--ghost-material-glass-blur` | dimension | `1.25rem` | `1.25rem` | Glass backdrop blur radius. |
| `material.glass.border` | `--ghost-material-glass-border` | color | `oklch(0.254 0.028 257.5 / 0.18)` | `oklch(0.96 0.005 250 / 0.16)` | Glass hairline border. |
| `material.glass.fallback.bg` | `--ghost-material-glass-fallback-bg` | color | `#ffffff` | `#24272b` | Opaque glass fallback when backdrop-filter is unavailable. |
| `material.glass.noise` | `--ghost-material-glass-noise` | image | `url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.8%22%20numOctaves%3D%224%22%20seed%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E")` | `url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.8%22%20numOctaves%3D%224%22%20seed%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E")` | Glass noise overlay image. |
| `material.glass.noise.opacity` | `--ghost-material-glass-noise-opacity` | number | `0.04` | `0.04` | Glass noise overlay opacity. |
| `material.glass.saturate` | `--ghost-material-glass-saturate` | number | `1.45` | `1.45` | Glass backdrop saturation boost. |
| `material.grain.bg` | `--ghost-material-grain-bg` | color | `#ffffff` | `#0f172a` | Grain material fill. |
| `material.grain.noise` | `--ghost-material-grain-noise` | image | `url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.8%22%20numOctaves%3D%224%22%20seed%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E")` | `url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.8%22%20numOctaves%3D%224%22%20seed%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E")` | Grain noise overlay image. |
| `material.grain.noise.opacity` | `--ghost-material-grain-noise-opacity` | number | `0.08` | `0.08` | Grain noise overlay opacity. |
| `material.solid.bg` | `--ghost-material-solid-bg` | color | `#ffffff` | `#0f172a` | Opaque solid material fill. |

### motion

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `motion.duration.expressive` | `--ghost-motion-duration-expressive` | duration | `700ms` | `700ms` | Emphasized duration for hero or springy motion. |
| `motion.duration.fast` | `--ghost-motion-duration-fast` | duration | `120ms` | `120ms` | Fast color, opacity, and control transitions. |
| `motion.duration.instant` | `--ghost-motion-duration-instant` | duration | `0ms` | `0ms` | No interpolation. |
| `motion.duration.moderate` | `--ghost-motion-duration-moderate` | duration | `250ms` | `250ms` | Default enter duration. Exits should use fast instead. |
| `motion.duration.slow` | `--ghost-motion-duration-slow` | duration | `400ms` | `400ms` | Large-surface duration. |
| `motion.easing.accelerate` | `--ghost-motion-easing-accelerate` | cubicBezier | `cubic-bezier(0.3, 0, 1, 1)` | `cubic-bezier(0.3, 0, 1, 1)` | Ease-in for exits. |
| `motion.easing.decelerate` | `--ghost-motion-easing-decelerate` | cubicBezier | `cubic-bezier(0, 0, 0, 1)` | `cubic-bezier(0, 0, 0, 1)` | Ease-out for enters. |
| `motion.easing.standard` | `--ghost-motion-easing-standard` | cubicBezier | `cubic-bezier(0.2, 0, 0, 1)` | `cubic-bezier(0.2, 0, 0, 1)` | Default symmetric easing. |
| `motion.enter.duration` | `--ghost-motion-enter-duration` | duration | `250ms` | `250ms` | Enter duration. Longer than exit so arrivals read clearly. |
| `motion.enter.easing` | `--ghost-motion-enter-easing` | cubicBezier | `cubic-bezier(0, 0, 0, 1)` | `cubic-bezier(0, 0, 0, 1)` | Enter easing. Decelerate into rest. |
| `motion.exit.duration` | `--ghost-motion-exit-duration` | duration | `120ms` | `120ms` | Exit duration. Faster than enter so departures get out of the way. |
| `motion.exit.easing` | `--ghost-motion-exit-easing` | cubicBezier | `cubic-bezier(0.3, 0, 1, 1)` | `cubic-bezier(0.3, 0, 1, 1)` | Exit easing. Accelerate out. |
| `motion.fade.duration` | `--ghost-motion-fade-duration` | duration | `120ms` | `120ms` | Opacity-only duration. Kept under reduced motion so state changes stay visible. |
| `motion.intensity` | `--ghost-motion-intensity` | number | `1` | `1` | Unitless 0–1 duration scale. Set --ghost-motion-intensity on any subtree to slow or freeze motion. |
| `motion.press.scale` | `--ghost-motion-press-scale` | number | `0.98` | `0.98` | Pressed control scale. 1 under reduced motion so only color feedback remains. |
| `motion.scale` | `--ghost-motion-scale` | number | `0.96` | `0.96` | Enter scale. 1 under reduced motion so only opacity remains. |
| `motion.spring.bouncy` | `--ghost-motion-spring-bouncy` | spring | `linear(0, 0.0336 1.3841%, 0.1536 3.1142%, 1.0771 11.7647%, 1.2198 14.1869%, 1.2801 16.609%, 1.2822 17.9931%, 1.259 19.7232%, 0.9889 28.7197%, 0.9437 31.1419%, 0.9209 33.91%, 0.9278 37.3702%, 1.0023 46.0208%, 1.0219 50.8651%, 1.0207 54.6713%, 0.9938 68.1661%, 1.0016 84.7751%, 1)` | `linear(0, 0.0336 1.3841%, 0.1536 3.1142%, 1.0771 11.7647%, 1.2198 14.1869%, 1.2801 16.609%, 1.2822 17.9931%, 1.259 19.7232%, 0.9889 28.7197%, 0.9437 31.1419%, 0.9209 33.91%, 0.9278 37.3702%, 1.0023 46.0208%, 1.0219 50.8651%, 1.0207 54.6713%, 0.9938 68.1661%, 1.0016 84.7751%, 1)` | Bouncy spring compiled to CSS linear(). |
| `motion.spring.bouncy.duration` | `--ghost-motion-spring-bouncy-duration` | duration | `1204ms` | `1204ms` | Settle duration for the bouncy spring. |
| `motion.spring.gentle` | `--ghost-motion-spring-gentle` | spring | `linear(0, 0.0191 2.1429%, 0.0866 5%, 0.4534 15.7143%, 0.6359 22.1429%, 0.767 28.5714%, 0.8204 32.1429%, 0.8698 36.4286%, 0.9065 40.7143%, 0.9369 45.7143%, 0.9751 57.1429%, 0.9934 72.8571%, 1)` | `linear(0, 0.0191 2.1429%, 0.0866 5%, 0.4534 15.7143%, 0.6359 22.1429%, 0.767 28.5714%, 0.8204 32.1429%, 0.8698 36.4286%, 0.9065 40.7143%, 0.9369 45.7143%, 0.9751 57.1429%, 0.9934 72.8571%, 1)` | Gentle spring compiled to CSS linear(). |
| `motion.spring.gentle.duration` | `--ghost-motion-spring-gentle-duration` | duration | `583ms` | `583ms` | Settle duration for the gentle spring. |
| `motion.spring.snappy` | `--ghost-motion-spring-snappy` | spring | `linear(0, 0.0043 0.8264%, 0.036 2.4793%, 0.1271 4.9587%, 0.6578 14.876%, 0.8392 19.0083%, 0.9867 23.9669%, 1.0328 26.4463%, 1.063 28.9256%, 1.0832 32.2314%, 1.0853 36.3636%, 1.0164 52.8926%, 0.9952 62.8099%, 1)` | `linear(0, 0.0043 0.8264%, 0.036 2.4793%, 0.1271 4.9587%, 0.6578 14.876%, 0.8392 19.0083%, 0.9867 23.9669%, 1.0328 26.4463%, 1.063 28.9256%, 1.0832 32.2314%, 1.0853 36.3636%, 1.0164 52.8926%, 0.9952 62.8099%, 1)` | Snappy spring compiled to CSS linear(). |
| `motion.spring.snappy.duration` | `--ghost-motion-spring-snappy-duration` | duration | `504ms` | `504ms` | Settle duration for the snappy spring. |
| `motion.stagger` | `--ghost-motion-stagger` | duration | `40ms` | `40ms` | Delay between staggered items. Zero under reduced motion. |
| `motion.translate` | `--ghost-motion-translate` | dimension | `0.5rem` | `0.5rem` | Enter/exit translation distance. 0 under reduced motion. |

### radius

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `radius.lg` | `--ghost-radius-lg` | dimension | `0.75rem` | `0.75rem` | Large radius. 12px at comfortable density and roundness 1. |
| `radius.md` | `--ghost-radius-md` | dimension | `0.5rem` | `0.5rem` | Medium radius. 8px at comfortable density and roundness 1. |
| `radius.none` | `--ghost-radius-none` | dimension | `0px` | `0px` | Sharp corner. Stays 0 at every roundness. |
| `radius.pill` | `--ghost-radius-pill` | dimension | `999px` | `999px` | Pill radius. Capsule at roundness 1; sharp at 0. |
| `radius.sm` | `--ghost-radius-sm` | dimension | `0.25rem` | `0.25rem` | Small radius. 4px at comfortable density and roundness 1. |
| `radius.xl` | `--ghost-radius-xl` | dimension | `1rem` | `1rem` | Extra-large radius. 16px at comfortable density and roundness 1. |

### roundness

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `roundness.amount` | `--ghost-roundness` | number | `1` | `1` | Unitless 0–1 corner scale compiled as --ghost-roundness. 0 is sharp; 1 is the designed radius. Set on any subtree. |

### space

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `space.gap.lg` | `--ghost-space-gap-lg` | dimension | `1rem` | `1rem` | Large gap. 16px at comfortable density. |
| `space.gap.md` | `--ghost-space-gap-md` | dimension | `0.75rem` | `0.75rem` | Medium gap. 12px at comfortable density. |
| `space.gap.sm` | `--ghost-space-gap-sm` | dimension | `0.5rem` | `0.5rem` | Small gap. 8px at comfortable density. |
| `space.gap.xs` | `--ghost-space-gap-xs` | dimension | `0.25rem` | `0.25rem` | Extra-small gap. 4px at comfortable density. |
| `space.inset.lg` | `--ghost-space-inset-lg` | dimension | `1.25rem` | `1.25rem` | Large inset. 20px at comfortable density. |
| `space.inset.md` | `--ghost-space-inset-md` | dimension | `1rem` | `1rem` | Medium inset. 16px at comfortable density. |
| `space.inset.sm` | `--ghost-space-inset-sm` | dimension | `0.75rem` | `0.75rem` | Small inset. 12px at comfortable density. |
| `space.inset.xs` | `--ghost-space-inset-xs` | dimension | `0.5rem` | `0.5rem` | Extra-small inset. 8px at comfortable density. |
| `space.stack.lg` | `--ghost-space-stack-lg` | dimension | `1.5rem` | `1.5rem` | Large stack gap. 24px at comfortable density. |
| `space.stack.md` | `--ghost-space-stack-md` | dimension | `1rem` | `1rem` | Medium stack gap. 16px at comfortable density. |
| `space.stack.sm` | `--ghost-space-stack-sm` | dimension | `0.5rem` | `0.5rem` | Small stack gap. 8px at comfortable density. |

### state

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `state.layer.dragged` | `--ghost-state-layer-dragged` | number | `0.16` | `0.16` | Dragged overlay opacity on the current tone. Used when aria-grabbed is true. |
| `state.layer.hover` | `--ghost-state-layer-hover` | number | `0.08` | `0.08` | Hover overlay opacity on the current tone. Works across every tone and mode. |
| `state.layer.press` | `--ghost-state-layer-press` | number | `0.12` | `0.12` | Pressed overlay opacity on the current tone. |
| `state.layer.selected` | `--ghost-state-layer-selected` | number | `0.1` | `0.1` | Selected overlay opacity on the current tone. Used when aria-pressed is true. |
| `state.mix.border` | `--ghost-state-mix-border` | number | `0.4` | `0.4` | Border mix of tone into the surface for soft treatments. |
| `state.mix.soft` | `--ghost-state-mix-soft` | number | `0.12` | `0.12` | Rest mix of tone into the surface for soft treatments. |

### status

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `status.danger.bg` | `--ghost-status-danger-bg` | color | `#fff8f7` | `#2b0f0f` | Danger status background. |
| `status.danger.border` | `--ghost-status-danger-border` | color | `#ffdad5` | `#632425` | Danger status border. |
| `status.danger.fg` | `--ghost-status-danger-fg` | color | `#900009` | `#ffb4b0` | Danger status foreground. |
| `status.info.bg` | `--ghost-status-info-bg` | color | `#f6fbff` | `#041d29` | Info status background. |
| `status.info.border` | `--ghost-status-info-border` | color | `#cfe7fc` | `#004661` | Info status border. |
| `status.info.fg` | `--ghost-status-info-fg` | color | `#004e7a` | `#99dbff` | Info status foreground. |
| `status.success.bg` | `--ghost-status-success-bg` | color | `#f5fcf6` | `#05220f` | Success status background. |
| `status.success.border` | `--ghost-status-success-border` | color | `#d1eed6` | `#045227` | Success status border. |
| `status.success.fg` | `--ghost-status-success-fg` | color | `#006029` | `#9feeb3` | Success status foreground. |
| `status.warning.bg` | `--ghost-status-warning-bg` | color | `#fff9f5` | `#261a00` | Warning status background. |
| `status.warning.border` | `--ghost-status-warning-border` | color | `#ffdfce` | `#5c4300` | Warning status border. |
| `status.warning.fg` | `--ghost-status-warning-fg` | color | `#873b00` | `#fed98e` | Warning status foreground. |

### surface

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `surface.bg` | `--ghost-surface-bg` | color | `#ffffff` | `#0f172a` | Theme canvas background. |
| `surface.fg` | `--ghost-surface-fg` | color | `#0f172a` | `#f8fafc` | Theme canvas foreground. |
| `surface.inverse.bg` | `--ghost-surface-inverse-bg` | color | `#0f172a` | `#f8fafc` | Inverted surface background. |
| `surface.inverse.fg` | `--ghost-surface-inverse-fg` | color | `#ffffff` | `#0f172a` | Foreground on an inverted surface. |
| `surface.muted.bg` | `--ghost-surface-muted-bg` | color | `#eceff3` | `#2e3135` | Muted surface fill behind grouped content. |
| `surface.subtle.bg` | `--ghost-surface-subtle-bg` | color | `#f9fafc` | `#1b1d1f` | Subtle surface fill for inset regions. |

### text

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `text.danger` | `--ghost-text-danger` | color | `#b91c1c` | `#f87171` | Danger-colored text on the canvas. |
| `text.default` | `--ghost-text-default` | color | `#0f172a` | `#f8fafc` | Default body text on the canvas. |
| `text.info` | `--ghost-text-info` | color | `#0369a1` | `#38bdf8` | Info-colored text on the canvas. |
| `text.inverse` | `--ghost-text-inverse` | color | `#ffffff` | `#0f172a` | Text on an inverted surface. |
| `text.muted` | `--ghost-text-muted` | color | `#334155` | `#d3dce7` | Secondary text on the canvas. |
| `text.primary` | `--ghost-text-primary` | color | `#1d4ed8` | `#60a5fa` | Primary-colored text on the canvas. |
| `text.subtle` | `--ghost-text-subtle` | color | `#4f5d72` | `#cbd5e1` | Tertiary text on the canvas. Still meets WCAG 2 AA. |
| `text.success` | `--ghost-text-success` | color | `#15803d` | `#4ade80` | Success-colored text on the canvas. |
| `text.warning` | `--ghost-text-warning` | color | `#b45309` | `#fbbf24` | Warning-colored text on the canvas. |

### type

| Token | CSS | Type | Light | Dark | Description |
| --- | --- | --- | --- | --- | --- |
| `type.family.sans` | `--ghost-type-family-sans` | fontFamily | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` | System UI sans stack. No web font. |
| `type.feature.default` | `--ghost-type-feature-default` | fontFeature | `"kern" 1, "liga" 1, "calt" 1` | `"kern" 1, "liga" 1, "calt" 1` | Default OpenType features. |
| `type.feature.tabular` | `--ghost-type-feature-tabular` | fontFeature | `"tnum" 1, "kern" 1, "liga" 1` | `"tnum" 1, "kern" 1, "liga" 1` | Tabular-number OpenType features. |
| `type.letter.normal` | `--ghost-type-letter-normal` | letterSpacing | `0em` | `0em` | Default letter-spacing. |
| `type.letter.tight` | `--ghost-type-letter-tight` | letterSpacing | `-0.02em` | `-0.02em` | Tight letter-spacing. |
| `type.letter.wide` | `--ghost-type-letter-wide` | letterSpacing | `0.04em` | `0.04em` | Wide letter-spacing. |
| `type.line.normal` | `--ghost-type-line-normal` | number | `1.5` | `1.5` | Default body line-height. |
| `type.line.snug` | `--ghost-type-line-snug` | number | `1.375` | `1.375` | Snug line-height. |
| `type.line.tight` | `--ghost-type-line-tight` | number | `1.2` | `1.2` | Tight line-height. |
| `type.numeric.proportional` | `--ghost-type-numeric-proportional` | fontVariant | `proportional-nums` | `proportional-nums` | Proportional numbers. Apply as font-variant-numeric. |
| `type.numeric.tabular` | `--ghost-type-numeric-tabular` | fontVariant | `tabular-nums` | `tabular-nums` | Tabular lining numbers. Apply as font-variant-numeric. |
| `type.size.2xl` | `--ghost-type-size-2xl` | fontSize | `clamp(1.5rem, 1.3333rem + 0.8333vw, 2rem)` | `clamp(1.5rem, 1.3333rem + 0.8333vw, 2rem)` | Fluid 2xl type. |
| `type.size.3xl` | `--ghost-type-size-3xl` | fontSize | `clamp(1.875rem, 1.6667rem + 1.0417vw, 2.5rem)` | `clamp(1.875rem, 1.6667rem + 1.0417vw, 2.5rem)` | Fluid 3xl type. |
| `type.size.lg` | `--ghost-type-size-lg` | fontSize | `clamp(1.0625rem, 1.0417rem + 0.1042vw, 1.125rem)` | `clamp(1.0625rem, 1.0417rem + 0.1042vw, 1.125rem)` | Fluid large type. |
| `type.size.md` | `--ghost-type-size-md` | fontSize | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | Fluid body type. |
| `type.size.sm` | `--ghost-type-size-sm` | fontSize | `clamp(0.8125rem, 0.7917rem + 0.1042vw, 0.875rem)` | `clamp(0.8125rem, 0.7917rem + 0.1042vw, 0.875rem)` | Fluid small type. |
| `type.size.xl` | `--ghost-type-size-xl` | fontSize | `clamp(1.25rem, 1.1667rem + 0.4167vw, 1.5rem)` | `clamp(1.25rem, 1.1667rem + 0.4167vw, 1.5rem)` | Fluid extra-large type. |
| `type.size.xs` | `--ghost-type-size-xs` | fontSize | `clamp(0.75rem, 0.7292rem + 0.1042vw, 0.8125rem)` | `clamp(0.75rem, 0.7292rem + 0.1042vw, 0.8125rem)` | Fluid extra-small type. |
| `type.weight.bold` | `--ghost-type-weight-bold` | fontWeight | `700` | `700` | Bold font weight. |
| `type.weight.medium` | `--ghost-type-weight-medium` | fontWeight | `500` | `500` | Medium font weight. |
| `type.weight.regular` | `--ghost-type-weight-regular` | fontWeight | `400` | `400` | Regular font weight. |
| `type.weight.semibold` | `--ghost-type-weight-semibold` | fontWeight | `600` | `600` | Semibold font weight. |

## Primitive tokens

Primitives are not CSS variables. Color ramps live here so semantic
tokens can alias a stable OKLCH scale.

| Token | Type | Value | Description |
| --- | --- | --- | --- |
| `asset.noise` | image | `url("data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%20160%20160%22%3E%3Cfilter%20id%3D%22n%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.8%22%20numOctaves%3D%224%22%20seed%3D%222%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23n)%22%2F%3E%3C%2Fsvg%3E")` | Tiled fractal-noise SVG for glass and grain overlays. Inline data URI; no network asset. |
| `color.danger.100` | color | `#ffecea` | Danger 100 (light-tuned). |
| `color.danger.1000` | color | `#1f0000` | Danger 1000 (light-tuned). |
| `color.danger.200` | color | `#ffdad5` | Danger 200 (light-tuned). |
| `color.danger.300` | color | `#ffbcb3` | Danger 300 (light-tuned). |
| `color.danger.400` | color | `#fe8e82` | Danger 400 (light-tuned). |
| `color.danger.50` | color | `#fff8f7` | Danger 50 (light-tuned). |
| `color.danger.500` | color | `#ec675b` | Danger 500 (light-tuned). |
| `color.danger.600` | color | `#d44038` | Danger 600 (light-tuned). |
| `color.danger.700` | color | `#b91c1c` | Danger 700 (light-tuned). |
| `color.danger.800` | color | `#900009` | Danger 800 (light-tuned). |
| `color.danger.900` | color | `#640004` | Danger 900 (light-tuned). |
| `color.danger.950` | color | `#400002` | Danger 950 (light-tuned). |
| `color.danger.dark.100` | color | `#ffd5d3` | Danger 100 (dark-tuned). |
| `color.danger.dark.1000` | color | `#190707` | Danger 1000 (dark-tuned). |
| `color.danger.dark.200` | color | `#ffb4b0` | Danger 200 (dark-tuned). |
| `color.danger.dark.300` | color | `#ff908d` | Danger 300 (dark-tuned). |
| `color.danger.dark.400` | color | `#f87171` | Danger 400 (dark-tuned). |
| `color.danger.dark.50` | color | `#ffedec` | Danger 50 (dark-tuned). |
| `color.danger.dark.500` | color | `#d65255` | Danger 500 (dark-tuned). |
| `color.danger.dark.600` | color | `#ac3c3f` | Danger 600 (dark-tuned). |
| `color.danger.dark.700` | color | `#852e30` | Danger 700 (dark-tuned). |
| `color.danger.dark.800` | color | `#632425` | Danger 800 (dark-tuned). |
| `color.danger.dark.900` | color | `#441919` | Danger 900 (dark-tuned). |
| `color.danger.dark.950` | color | `#2b0f0f` | Danger 950 (dark-tuned). |
| `color.hairline` | color | `oklch(0.254 0.028 257.5 / 0.18)` | Alpha hairline border tinted with the neutral hue. |
| `color.highlight.inset` | color | `oklch(1 0.012 258 / 0.28)` | Inset top sheen for raised actions in light mode. |
| `color.info.100` | color | `#e7f3fd` | Info 100 (light-tuned). |
| `color.info.1000` | color | `#000c19` | Info 1000 (light-tuned). |
| `color.info.200` | color | `#cfe7fc` | Info 200 (light-tuned). |
| `color.info.300` | color | `#acd4f5` | Info 300 (light-tuned). |
| `color.info.400` | color | `#81b9e5` | Info 400 (light-tuned). |
| `color.info.50` | color | `#f6fbff` | Info 50 (light-tuned). |
| `color.info.500` | color | `#579dd1` | Info 500 (light-tuned). |
| `color.info.600` | color | `#2f82ba` | Info 600 (light-tuned). |
| `color.info.700` | color | `#0369a1` | Info 700 (light-tuned). |
| `color.info.800` | color | `#004e7a` | Info 800 (light-tuned). |
| `color.info.900` | color | `#003454` | Info 900 (light-tuned). |
| `color.info.950` | color | `#001f35` | Info 950 (light-tuned). |
| `color.info.dark.100` | color | `#c5eaff` | Info 100 (dark-tuned). |
| `color.info.dark.1000` | color | `#020f17` | Info 1000 (dark-tuned). |
| `color.info.dark.200` | color | `#99dbff` | Info 200 (dark-tuned). |
| `color.info.dark.300` | color | `#65ccff` | Info 300 (dark-tuned). |
| `color.info.dark.400` | color | `#38bdf8` | Info 400 (dark-tuned). |
| `color.info.dark.50` | color | `#e3f5ff` | Info 50 (dark-tuned). |
| `color.info.dark.500` | color | `#009bd2` | Info 500 (dark-tuned). |
| `color.info.dark.600` | color | `#007aa6` | Info 600 (dark-tuned). |
| `color.info.dark.700` | color | `#005d80` | Info 700 (dark-tuned). |
| `color.info.dark.800` | color | `#004661` | Info 800 (dark-tuned). |
| `color.info.dark.900` | color | `#042f42` | Info 900 (dark-tuned). |
| `color.info.dark.950` | color | `#041d29` | Info 950 (dark-tuned). |
| `color.ink` | color | `#0f172a` | Near-black canvas ink used for light-mode text and dark-mode surfaces. |
| `color.mist` | color | `#f8fafc` | Near-white canvas foreground used in dark mode. |
| `color.neutral.100` | color | `#eceff3` | Neutral 100 (light-tuned). |
| `color.neutral.1000` | color | `#070b11` | Neutral 1000 (light-tuned). |
| `color.neutral.200` | color | `#d9dee6` | Neutral 200 (light-tuned). |
| `color.neutral.300` | color | `#bcc4d1` | Neutral 300 (light-tuned). |
| `color.neutral.400` | color | `#95a1b2` | Neutral 400 (light-tuned). |
| `color.neutral.50` | color | `#f9fafc` | Neutral 50 (light-tuned). |
| `color.neutral.500` | color | `#707e92` | Neutral 500 (light-tuned). |
| `color.neutral.600` | color | `#4f5d72` | Neutral 600 (light-tuned). |
| `color.neutral.700` | color | `#334155` | Neutral 700 (light-tuned). |
| `color.neutral.800` | color | `#263243` | Neutral 800 (light-tuned). |
| `color.neutral.900` | color | `#1a2330` | Neutral 900 (light-tuned). |
| `color.neutral.950` | color | `#111720` | Neutral 950 (light-tuned). |
| `color.neutral.dark.100` | color | `#e8ecf1` | Neutral 100 (dark-tuned). |
| `color.neutral.dark.1000` | color | `#0c0d0f` | Neutral 1000 (dark-tuned). |
| `color.neutral.dark.200` | color | `#dee4eb` | Neutral 200 (dark-tuned). |
| `color.neutral.dark.300` | color | `#d3dce7` | Neutral 300 (dark-tuned). |
| `color.neutral.dark.400` | color | `#cbd5e1` | Neutral 400 (dark-tuned). |
| `color.neutral.dark.50` | color | `#f0f2f5` | Neutral 50 (dark-tuned). |
| `color.neutral.dark.500` | color | `#a3adb9` | Neutral 500 (dark-tuned). |
| `color.neutral.dark.600` | color | `#7f8790` | Neutral 600 (dark-tuned). |
| `color.neutral.dark.700` | color | `#60666e` | Neutral 700 (dark-tuned). |
| `color.neutral.dark.800` | color | `#464b50` | Neutral 800 (dark-tuned). |
| `color.neutral.dark.900` | color | `#2e3135` | Neutral 900 (dark-tuned). |
| `color.neutral.dark.950` | color | `#1b1d1f` | Neutral 950 (dark-tuned). |
| `color.primary.100` | color | `#eaf1ff` | Primary 100 (light-tuned). |
| `color.primary.1000` | color | `#00052d` | Primary 1000 (light-tuned). |
| `color.primary.200` | color | `#d6e3ff` | Primary 200 (light-tuned). |
| `color.primary.300` | color | `#b6ceff` | Primary 300 (light-tuned). |
| `color.primary.400` | color | `#89afff` | Primary 400 (light-tuned). |
| `color.primary.50` | color | `#f8faff` | Primary 50 (light-tuned). |
| `color.primary.500` | color | `#5b8dff` | Primary 500 (light-tuned). |
| `color.primary.600` | color | `#356af3` | Primary 600 (light-tuned). |
| `color.primary.700` | color | `#1d4ed8` | Primary 700 (light-tuned). |
| `color.primary.800` | color | `#0d35ae` | Primary 800 (light-tuned). |
| `color.primary.900` | color | `#05217d` | Primary 900 (light-tuned). |
| `color.primary.950` | color | `#021350` | Primary 950 (light-tuned). |
| `color.primary.dark.100` | color | `#cde3ff` | Primary 100 (dark-tuned). |
| `color.primary.dark.1000` | color | `#050e19` | Primary 1000 (dark-tuned). |
| `color.primary.dark.200` | color | `#a8ceff` | Primary 200 (dark-tuned). |
| `color.primary.dark.300` | color | `#80b8ff` | Primary 300 (dark-tuned). |
| `color.primary.dark.400` | color | `#60a5fa` | Primary 400 (dark-tuned). |
| `color.primary.dark.50` | color | `#e9f3ff` | Primary 50 (dark-tuned). |
| `color.primary.dark.500` | color | `#4286d9` | Primary 500 (dark-tuned). |
| `color.primary.dark.600` | color | `#2f69af` | Primary 600 (dark-tuned). |
| `color.primary.dark.700` | color | `#235187` | Primary 700 (dark-tuned). |
| `color.primary.dark.800` | color | `#1c3d64` | Primary 800 (dark-tuned). |
| `color.primary.dark.900` | color | `#132944` | Primary 900 (dark-tuned). |
| `color.primary.dark.950` | color | `#0c1a2b` | Primary 950 (dark-tuned). |
| `color.raised.2` | color | `#24272b` | Dark-mode elevation 2 fill between neutral 950 and 900. |
| `color.raised.4` | color | `#3a3e43` | Dark-mode elevation 4 fill between neutral 900 and 800. |
| `color.shadow.ambient` | color | `oklch(0.254 0.028 257.5 / 0.08)` | Neutral-hue ambient shadow tint. Alpha is the light-mode rest value. |
| `color.shadow.highlight` | color | `oklch(1 0.005 258 / 0.12)` | Inset top highlight used by dark-mode elevation. |
| `color.shadow.key` | color | `oklch(0.254 0.028 257.5 / 0.14)` | Neutral-hue key-light shadow tint. Alpha is the light-mode rest value. |
| `color.success.100` | color | `#e8f6ea` | Success 100 (light-tuned). |
| `color.success.1000` | color | `#001003` | Success 1000 (light-tuned). |
| `color.success.200` | color | `#d1eed6` | Success 200 (light-tuned). |
| `color.success.300` | color | `#b1dfb9` | Success 300 (light-tuned). |
| `color.success.400` | color | `#87c895` | Success 400 (light-tuned). |
| `color.success.50` | color | `#f5fcf6` | Success 50 (light-tuned). |
| `color.success.500` | color | `#5fb073` | Success 500 (light-tuned). |
| `color.success.600` | color | `#389754` | Success 600 (light-tuned). |
| `color.success.700` | color | `#15803d` | Success 700 (light-tuned). |
| `color.success.800` | color | `#006029` | Success 800 (light-tuned). |
| `color.success.900` | color | `#004019` | Success 900 (light-tuned). |
| `color.success.950` | color | `#00270c` | Success 950 (light-tuned). |
| `color.success.dark.100` | color | `#c4f6cf` | Success 100 (dark-tuned). |
| `color.success.dark.1000` | color | `#021206` | Success 1000 (dark-tuned). |
| `color.success.dark.200` | color | `#9feeb3` | Success 200 (dark-tuned). |
| `color.success.dark.300` | color | `#6ee794` | Success 300 (dark-tuned). |
| `color.success.dark.400` | color | `#4ade80` | Success 400 (dark-tuned). |
| `color.success.dark.50` | color | `#dffae5` | Success 50 (dark-tuned). |
| `color.success.dark.500` | color | `#00b95d` | Success 500 (dark-tuned). |
| `color.success.dark.600` | color | `#009148` | Success 600 (dark-tuned). |
| `color.success.dark.700` | color | `#006f35` | Success 700 (dark-tuned). |
| `color.success.dark.800` | color | `#045227` | Success 800 (dark-tuned). |
| `color.success.dark.900` | color | `#06371a` | Success 900 (dark-tuned). |
| `color.success.dark.950` | color | `#05220f` | Success 950 (dark-tuned). |
| `color.warning.100` | color | `#ffeee6` | Warning 100 (light-tuned). |
| `color.warning.1000` | color | `#180500` | Warning 1000 (light-tuned). |
| `color.warning.200` | color | `#ffdfce` | Warning 200 (light-tuned). |
| `color.warning.300` | color | `#fec6a8` | Warning 300 (light-tuned). |
| `color.warning.400` | color | `#f1a67d` | Warning 400 (light-tuned). |
| `color.warning.50` | color | `#fff9f5` | Warning 50 (light-tuned). |
| `color.warning.500` | color | `#e08755` | Warning 500 (light-tuned). |
| `color.warning.600` | color | `#cb6a2e` | Warning 600 (light-tuned). |
| `color.warning.700` | color | `#b45309` | Warning 700 (light-tuned). |
| `color.warning.800` | color | `#873b00` | Warning 800 (light-tuned). |
| `color.warning.900` | color | `#5b2600` | Warning 900 (light-tuned). |
| `color.warning.950` | color | `#381400` | Warning 950 (light-tuned). |
| `color.warning.dark.100` | color | `#fee7b8` | Warning 100 (dark-tuned). |
| `color.warning.dark.1000` | color | `#140c00` | Warning 1000 (dark-tuned). |
| `color.warning.dark.200` | color | `#fed98e` | Warning 200 (dark-tuned). |
| `color.warning.dark.300` | color | `#ffcb56` | Warning 300 (dark-tuned). |
| `color.warning.dark.400` | color | `#fbbf24` | Warning 400 (dark-tuned). |
| `color.warning.dark.50` | color | `#fdf0d7` | Warning 50 (dark-tuned). |
| `color.warning.dark.500` | color | `#ce9a00` | Warning 500 (dark-tuned). |
| `color.warning.dark.600` | color | `#a17800` | Warning 600 (dark-tuned). |
| `color.warning.dark.700` | color | `#7b5b00` | Warning 700 (dark-tuned). |
| `color.warning.dark.800` | color | `#5c4300` | Warning 800 (dark-tuned). |
| `color.warning.dark.900` | color | `#3e2c00` | Warning 900 (dark-tuned). |
| `color.warning.dark.950` | color | `#261a00` | Warning 950 (dark-tuned). |
| `color.white` | color | `#ffffff` | Canvas white. Not part of a generated hue ramp. |
| `control.height.28` | dimension | `1.75rem` | Control height 28px. |
| `control.height.32` | dimension | `2rem` | Control height 32px. |
| `control.height.36` | dimension | `2.25rem` | Control height 36px. |
| `control.height.40` | dimension | `2.5rem` | Control height 40px. |
| `control.height.48` | dimension | `3rem` | Control height 48px. |
| `control.touch` | dimension | `2.75rem` | 44px minimum used as a coarse-pointer floor. |
| `duration.expressive` | duration | `700ms` | Longest emphasized duration. |
| `duration.fast` | duration | `120ms` | Fast interaction duration. |
| `duration.feedback` | duration | `80ms` | Short color and opacity feedback used under reduced motion. Not zero so state changes stay visible. |
| `duration.instant` | duration | `0ms` | No delay. Used for snappings that should not interpolate. |
| `duration.moderate` | duration | `250ms` | Default enter and shared-element duration. |
| `duration.slow` | duration | `400ms` | Large-surface duration. |
| `duration.stagger` | duration | `40ms` | Delay between successive items in a staggered sequence. |
| `easing.accelerate` | cubicBezier | `cubic-bezier(0.3, 0, 1, 1)` | Ease-in. Use for exits. |
| `easing.decelerate` | cubicBezier | `cubic-bezier(0, 0, 0, 1)` | Ease-out. Use for enters. |
| `easing.standard` | cubicBezier | `cubic-bezier(0.2, 0, 0, 1)` | Default symmetric easing. |
| `font.family.sans` | fontFamily | `ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"` | System UI sans stack. No web font. |
| `font.feature.default` | fontFeature | `"kern" 1, "liga" 1, "calt" 1` | Default OpenType features. Kerning, ligatures, contextual alternates. |
| `font.feature.none` | fontFeature | `normal` | No OpenType feature settings. |
| `font.feature.tabular` | fontFeature | `"tnum" 1, "kern" 1, "liga" 1` | Tabular-number OpenType features. |
| `font.letter.normal` | letterSpacing | `0em` | Default letter-spacing. |
| `font.letter.tight` | letterSpacing | `-0.02em` | Tight letter-spacing. |
| `font.letter.wide` | letterSpacing | `0.04em` | Wide letter-spacing. |
| `font.line.normal` | number | `1.5` | Default body line-height. |
| `font.line.snug` | number | `1.375` | Snug line-height. |
| `font.line.tight` | number | `1.2` | Tight line-height. Matches GhostButton. |
| `font.numeric.proportional` | fontVariant | `proportional-nums` | Proportional numbers. font-variant-numeric. |
| `font.numeric.tabular` | fontVariant | `tabular-nums` | Tabular lining numbers. font-variant-numeric. |
| `font.size.2xl` | fontSize | `clamp(1.5rem, 1.3333rem + 0.8333vw, 2rem)` | Fluid 2xl type. 24–32px from 320–1280px. |
| `font.size.3xl` | fontSize | `clamp(1.875rem, 1.6667rem + 1.0417vw, 2.5rem)` | Fluid 3xl type. 30–40px from 320–1280px. |
| `font.size.lg` | fontSize | `clamp(1.0625rem, 1.0417rem + 0.1042vw, 1.125rem)` | Fluid large type. 17–18px from 320–1280px. |
| `font.size.md` | fontSize | `clamp(0.9375rem, 0.9167rem + 0.1042vw, 1rem)` | Fluid body type. 15–16px from 320–1280px. |
| `font.size.sm` | fontSize | `clamp(0.8125rem, 0.7917rem + 0.1042vw, 0.875rem)` | Fluid small type. 13–14px from 320–1280px. |
| `font.size.xl` | fontSize | `clamp(1.25rem, 1.1667rem + 0.4167vw, 1.5rem)` | Fluid extra-large type. 20–24px from 320–1280px. |
| `font.size.xs` | fontSize | `clamp(0.75rem, 0.7292rem + 0.1042vw, 0.8125rem)` | Fluid extra-small type. 12–13px from 320–1280px. |
| `font.weight.bold` | fontWeight | `700` | Bold font weight. |
| `font.weight.medium` | fontWeight | `500` | Medium font weight. |
| `font.weight.regular` | fontWeight | `400` | Regular font weight. |
| `font.weight.semibold` | fontWeight | `600` | Semibold font weight. |
| `opacity.disabled` | number | `0.55` | Unavailable-state opacity. |
| `opacity.dragged` | number | `0.16` | Dragged state-layer overlay opacity. Applied on the current tone. |
| `opacity.glass` | number | `0.04` | Glass material noise overlay opacity. |
| `opacity.grain` | number | `0.08` | Grain material noise overlay opacity. |
| `opacity.hover` | number | `0.08` | Hover state-layer overlay opacity. Applied on the current tone. |
| `opacity.mix.border` | number | `0.4` | Soft-treatment border mix of tone into the surface. |
| `opacity.mix.soft` | number | `0.12` | Soft-treatment rest mix of tone into the surface. |
| `opacity.press` | number | `0.12` | Pressed state-layer overlay opacity. Applied on the current tone. |
| `opacity.selected` | number | `0.1` | Selected state-layer overlay opacity. Applied on the current tone. |
| `opacity.spinner` | number | `0.35` | Reduced-motion spinner pulse trough opacity. |
| `radius.scale.lg` | dimension | `0.75rem` | Large corner radius. 12px at roundness 1. |
| `radius.scale.md` | dimension | `0.5rem` | Medium corner radius. 8px at roundness 1. |
| `radius.scale.none` | dimension | `0px` | Sharp corner. Roundness 0. |
| `radius.scale.pill` | dimension | `999px` | Pill radius. Capsule at roundness 1. |
| `radius.scale.sm` | dimension | `0.25rem` | Small corner radius. 4px at roundness 1. |
| `radius.scale.xl` | dimension | `1rem` | Extra-large corner radius. 16px at roundness 1. |
| `saturate.glass` | number | `1.45` | Glass material backdrop saturation boost. |
| `scale.motion` | number | `0.96` | Default enter scale. 1 means no scale motion. |
| `scale.press` | number | `0.98` | Pressed control scale. 1 under reduced motion. |
| `size.blur.glass` | dimension | `1.25rem` | Glass material backdrop blur. |
| `size.focus.offset` | dimension | `2px` | Gap between a control and its focus ring. |
| `size.focus.width` | dimension | `3px` | Focus outline thickness. |
| `size.hairline` | dimension | `1px` | Hairline border width at 1x. High-DPR screens use 0.5px via the compiler. |
| `size.icon` | dimension | `1.1em` | Icon size relative to the label. |
| `size.motion.translate` | dimension | `0.5rem` | Default enter/exit translation distance. |
| `size.spinner.width` | dimension | `2px` | Default spinner stroke width. |
| `space.0` | dimension | `0px` | Space 0. 4px grid. |
| `space.1` | dimension | `0.25rem` | Space 1. 4px. |
| `space.10` | dimension | `2.5rem` | Space 10. 40px. |
| `space.12` | dimension | `3rem` | Space 12. 48px. |
| `space.16` | dimension | `4rem` | Space 16. 64px. |
| `space.2` | dimension | `0.5rem` | Space 2. 8px. |
| `space.3` | dimension | `0.75rem` | Space 3. 12px. |
| `space.4` | dimension | `1rem` | Space 4. 16px. |
| `space.5` | dimension | `1.25rem` | Space 5. 20px. |
| `space.6` | dimension | `1.5rem` | Space 6. 24px. |
| `space.8` | dimension | `2rem` | Space 8. 32px. |
| `spring.bouncy` | spring | `linear(0, 0.0336 1.3841%, 0.1536 3.1142%, 1.0771 11.7647%, 1.2198 14.1869%, 1.2801 16.609%, 1.2822 17.9931%, 1.259 19.7232%, 0.9889 28.7197%, 0.9437 31.1419%, 0.9209 33.91%, 0.9278 37.3702%, 1.0023 46.0208%, 1.0219 50.8651%, 1.0207 54.6713%, 0.9938 68.1661%, 1.0016 84.7751%, 1)` | Underdamped spring that overshoots before settling. |
| `spring.gentle` | spring | `linear(0, 0.0191 2.1429%, 0.0866 5%, 0.4534 15.7143%, 0.6359 22.1429%, 0.767 28.5714%, 0.8204 32.1429%, 0.8698 36.4286%, 0.9065 40.7143%, 0.9369 45.7143%, 0.9751 57.1429%, 0.9934 72.8571%, 1)` | Critically damped spring. No overshoot. |
| `spring.snappy` | spring | `linear(0, 0.0043 0.8264%, 0.036 2.4793%, 0.1271 4.9587%, 0.6578 14.876%, 0.8392 19.0083%, 0.9867 23.9669%, 1.0328 26.4463%, 1.063 28.9256%, 1.0832 32.2314%, 1.0853 36.3636%, 1.0164 52.8926%, 0.9952 62.8099%, 1)` | Underdamped spring with a short settle. |

