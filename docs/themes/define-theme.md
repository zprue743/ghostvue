# defineTheme and flagship themes

`defineTheme` is a **Node-only** generator in `@slop-ui/themes/define`. It
turns a small brand input into a complete token sheet scoped to
`data-sl-theme`. It is not re-exported from `@slop-ui/themes`, so application
bundles cannot pull `culori` by accident. `culori` stays a themes
`devDependency`.

The signed-off contract is [ADR 0008](../adr/0008-define-theme.md). `default`
remains hand-authored DTCG; flagships are checked-in `defineTheme` calls
compiled at package build.

## Generate a theme

```ts
import { writeFileSync } from 'node:fs'
import { defineTheme } from '@slop-ui/themes/define'

const acme = defineTheme({ name: 'acme', primary: '#0f766e', roundness: 0.5 })
writeFileSync('src/acme.css', acme.css)
```

A thin CLI wraps the same function:

```bash
pnpm --filter @slop-ui/themes define-theme --name acme --primary '#0f766e' --out acme.css
```

`primary` is an OKLCH hue in `[0, 360]` or an absolute CSS color. Hue-only
inputs keep the library's role lightness and chroma. Color strings become
the light seed and donate hue/chroma to the independently-tuned dark
template lightness. Defaults: `neutralTint` from the primary hue at library
neutral chroma; status seeds from `default`; `roundness = 1`;
`density = 'comfortable'`; `motionIntensity = 1`; `elevation = 'standard'`;
`gradient = 'subtle'`.

Invalid names, hues, colors, enums, or ranges **throw**. After the generator
walks `*.fg` / on-color steps (and action fills so white or ink labels can
meet AA), it throws if any `evaluateContrast` pair still fails WCAG 2 AA.

## Apply and nest

Import recipes plus every theme the page might show, then set
`data-sl-theme` on the host **before first paint**:

```ts
import '@slop-ui/themes/default.css'
import '@slop-ui/themes/calm.css'
import '@slop-ui/themes/vibrant.css'
import '@slop-ui/themes/mono.css'
```

```html
<main class="slop-theme" data-sl-theme="calm">…</main>
```

`.slop-theme` without `data-sl-theme` is `default`. Named sheets match
`:where([data-sl-theme='name'])`. `.slop-themed-scope` is a recipe scope
only (`display: contents`); it is not a token host, so a themed wrapper
inside a nested flagship inherits that flagship. `data-sl-mode` and
`data-sl-density` stay orthogonal. Unset mode still follows
`prefers-color-scheme`. A theme's `density` default applies only under that
`data-sl-theme`.

`startThemeTransition` remains mode-only. Theme switches are
`setAttribute('data-sl-theme', name)`.

## Flagships

| `data-sl-theme` | Intent              | Knobs                                                                                       |
| --------------- | ------------------- | ------------------------------------------------------------------------------------------- |
| `calm`          | Refined enterprise  | hue 215, compact, roundness 0.3, motion 0.6, elevation subtle, gradient none                |
| `vibrant`       | Striking expressive | hue 292, comfortable, roundness 1, motion 1, elevation dramatic, gradient aurora            |
| `mono`          | Crisp monochrome    | `#171717`, `neutralTint: 'none'`, roundness 0, motion 0.45, elevation subtle, gradient none |

`mono` keeps default **status** hues so danger and success stay
distinguishable. These files are package exports:

- `@slop-ui/themes/calm.css`
- `@slop-ui/themes/vibrant.css`
- `@slop-ui/themes/mono.css`

Docs chrome dogfoods `calm` on first paint and ships a switcher for
`default` \| `calm` \| `vibrant` \| `mono`. A blocking inline script restores
a persisted choice from `localStorage` before paint. `default` remains the
published baseline for applications.
