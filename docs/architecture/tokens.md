# Design tokens

Token taxonomy and source format are accepted in
[ADR 0005](../adr/0005-design-token-taxonomy.md). This page is the working
reference for authors and agents. The compile pipeline is not built yet;
do not treat this as a runnable emit graph.

## Source of truth

Authored tokens are **DTCG JSON** (W3C Design Tokens Community Group):
`$type`, `$value`, `$description`, and `{reference.path}` aliases. Agents
and design tools read and write this format. CSS is a compile output, not
the source.

Intended layout, once the pipeline lands:

```text
packages/themes/tokens/primitives.json
packages/themes/tokens/semantic.json
packages/themes/tokens/components/button.json
```

## Tiers

1. **Primitive** — raw palette, type, space, radius, duration. No product
   intent (`color.blue.700`).
2. **Semantic** — product intent (`color.accent` → `{color.blue.700}`).
3. **Component** — one component's defaults (`button.accent.color` →
   `{color.accent}`).

Component tokens may only reference semantic or primitive tokens. Semantic
tokens may only reference primitives.

## Compile outputs

A follow-up pipeline must emit all three:

| Output                | Role                                                 |
| --------------------- | ---------------------------------------------------- |
| CSS custom properties | Runtime for themed components and consumer overrides |
| TypeScript types      | Typed public token names for Vue, docs, and codegen  |
| JSON manifest         | Resolved values for MCP and agents                   |

The JSON token manifest is not the per-component gate manifest in
[ADR 0006](../adr/0006-component-manifest-schema.md).

Public CSS names use the `slop-` prefix (`--slop-button-accent-color`). Vue
components are `SlButton` (ADR 0003); CSS does not use Shoelace's `sl-`
namespace. Private derived properties (`--_slop-*`) are not in the TS or
JSON public catalog.

## Mapping from PR #20 `default.css`

Until DTCG files exist, `packages/themes/src/default.css` on
[PR #20](https://github.com/zprue743/slop-ui/pull/20) is the runtime
snapshot the pipeline must be able to reproduce:

| CSS custom property                              | Tier      | Authored token                      |
| ------------------------------------------------ | --------- | ----------------------------------- |
| `--slop-theme-surface`, `--slop-theme-color`     | semantic  | `color.surface`, `color.foreground` |
| `--slop-button-*` (tone, size, focus, radius, …) | component | `button.*`                          |
| `light-dark(#1d4ed8, #60a5fa)` literals          | primitive | `color.blue.700` / `color.blue.400` |
| `--_slop-button-*`                               | private   | not a public token                  |

Do not rename `--slop-theme-*` in #20. Aliases such as `--slop-color-surface`
may land with the pipeline. Light and dark stay one public name via CSS
`light-dark()`.

Primitives may be authored in DTCG before they are published as CSS. CSS
publication of a primitive still waits until two components share it.

## Authoring rules

- Prefer aliases (`{color.accent}`) over copied hex values in component
  files.
- Do not put the tier word in the token name.
- New theme CSS must not invent a parallel naming scheme next to
  `--slop-button-*` / `--slop-theme-*`.
- Headless `@slop-ui/vue` components must not require these tokens to
  function. Themed wrappers consume them as in ADR 0004 (SLO-10).
