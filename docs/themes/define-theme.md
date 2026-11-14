# defineTheme and flagship themes

`defineTheme` is a **Node-only** generator in `@ghostvue/themes/define`. It
turns a small brand input into a complete token sheet scoped to
`data-ghost-theme`. It is not re-exported from `@ghostvue/themes`, so application
bundles cannot pull `culori` by accident. `culori` stays a themes
`devDependency`, but its code is bundled into `dist/define.js`; see
`packages/themes/THIRD_PARTY_NOTICES.md` for the MIT license text.

The signed-off contract is [ADR 0008](../adr/0008-define-theme.md). `default`
remains hand-authored DTCG; flagships are checked-in `defineTheme` calls
compiled at package build.

## Generate a theme

```ts
import { writeFileSync } from 'node:fs'
import { defineTheme } from '@ghostvue/themes/define'

const acme = defineTheme({ name: 'acme', primary: '#0f766e', roundness: 0.5 })
writeFileSync('src/acme.css', acme.css)
```

A thin CLI wraps the same function:

```bash
pnpm --filter @ghostvue/themes define-theme --name acme --primary '#0f766e' --out acme.css
```

`primary` is an OKLCH hue in `[0, 360]` or an absolute CSS color. Hue-only
inputs keep the library's role lightness and chroma. Color strings become
the light seed and donate hue/chroma to the independently-tuned dark
template lightness. Defaults: `neutralTint` from the primary hue at library
neutral chroma; status seeds from `default`; `roundness = 1`;
`density = 'comfortable'`; `motionIntensity = 1`; `elevation = 'standard'`;
`gradient = 'subtle'`; `interactivity = 'subtle'`.

Invalid names, hues, colors, enums, or ranges **throw**. After the generator
walks `*.fg` / on-color steps (and action fills so white or ink labels can
meet AA), it throws if any `evaluateContrast` pair still fails WCAG 2 AA.

## Apply and nest

Import recipes plus every theme the page might show, then set
`data-ghost-theme` on the host **before first paint**:

```ts
import '@ghostvue/themes/default.css'
import '@ghostvue/themes/calm.css'
import '@ghostvue/themes/vibrant.css'
import '@ghostvue/themes/mono.css'
```

```html
<main class="ghost-theme" data-ghost-theme="calm">…</main>
```

`.ghost-theme` without `data-ghost-theme` is `default`. Named sheets match
`:where([data-ghost-theme='name'])`. `.ghost-themed-scope` is a recipe scope
only (`display: contents`); it is not a token host, so a themed wrapper
inside a nested flagship inherits that flagship. `data-ghost-mode` and
`data-ghost-density` stay orthogonal. Unset mode still follows
`prefers-color-scheme`. A theme's `density` default applies only under that
`data-ghost-theme`.

`startThemeTransition` remains mode-only. Theme switches are
`setAttribute('data-ghost-theme', name)`.

## Flagships

| `data-ghost-theme` | Intent              | Knobs                                                                                                             |
| ------------------ | ------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `calm`             | Refined enterprise  | hue 215, compact, roundness 0.3, motion 0.6, elevation subtle, gradient none, interactivity subtle                |
| `vibrant`          | Striking expressive | hue 292, comfortable, roundness 1, motion 1, elevation dramatic, gradient aurora, interactivity expressive        |
| `mono`             | Crisp monochrome    | `#171717`, `neutralTint: 'none'`, roundness 0, motion 0.45, elevation subtle, gradient none, interactivity subtle |

`mono` keeps default **status** hues so danger and success stay
distinguishable. These files are package exports:

- `@ghostvue/themes/calm.css`
- `@ghostvue/themes/vibrant.css`
- `@ghostvue/themes/mono.css`

Docs chrome dogfoods `calm` on first paint and ships a switcher for
`default` \| `calm` \| `vibrant` \| `mono`. A blocking inline script restores
a persisted choice from `localStorage` before paint. `default` remains the
published baseline for applications.
