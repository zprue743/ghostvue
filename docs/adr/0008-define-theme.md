# ADR 0008: Brand-input theme generator and flagship themes

- Status: accepted
- Date: 2026-11-11
- Decision owners: Zac Pruett, repository maintainers
- Relates to: [ADR 0007](./0007-token-pipeline.md) (pipeline, `data-sl-*`,
  CSS names); SLO-68 / SLO-61f

Accepted 2026-11-11 with the answers in [Decision record](#decision-record-zac-2026-11-11).

## Context

ADR 0007 compiles one authored theme (`default`) from DTCG JSON. Brand
seeds in `seeds.json` become 12-step OKLCH ramps; semantic files alias
those ramps; CSS custom properties switch on `data-sl-theme`,
`data-sl-mode`, and `data-sl-density`. `--sl-roundness` and
`--sl-motion-intensity` already scale nested subtrees through `calc()`.
`culori` is a **devDependency** of `@slop-ui/themes` (ramps + `pnpm
contrast`). Unset `data-sl-mode` follows `prefers-color-scheme` in CSS, so
SSR does not flash the opposite palette.

SLO-68 asks for `defineTheme({ primaryHue, neutralTint, roundness,
density, motionIntensity })` that emits a complete theme, runtime
switching with no SSR flash, nested scoped themes, three flagship themes
(calm enterprise, vibrant expressive, minimal monochrome), and a docs
switcher that dogfoods a flagship. The generator is a new public contract:
wrong delivery, scoping, or contrast rules would freeze a bad API.

Constraints: no new browser runtime dependency without Zac's approval;
do not mutate consumer data; do not expose internal DOM as the
customization API; `default` stays the authored DTCG source of truth.

## Decision

### 1. Build-time generation; CSS string returned, `.css` files shipped

`defineTheme` runs **on the Node side only** (app build, package build, or
a thin CLI wrapper). It returns a CSS string plus catalogs. Flagship
themes are compiled at `@slop-ui/themes` build and published as `.css`
files. Runtime switching applies pre-generated CSS with `data-sl-theme`.

| Delivery                    | Role                                                 |
| --------------------------- | ---------------------------------------------------- |
| `defineTheme(…).css`        | Canonical generator output                           |
| Published `.css` files      | How flagships (and typical apps) ship                |
| CLI that writes that string | Convenience, not a second compiler                   |
| Vite plugin                 | Not v1; `writeFileSync` / a virtual module is enough |

Rejected for v1: generating ramps in the browser (would put `culori` on
the client and flash unless every SSR response inlined fresh CSS);
shipping only a Vite plugin (locks non-Vite consumers).

`culori` stays out of the **browser** graph. The Node generator may keep
using it. **Do not add `culori` as a runtime dependency of
`@slop-ui/themes`'s main entry.** Promoting it to a browser dependency
needs Zac's approval ([dependency policy](../standards/dependencies.md)).

### 2. Signature

`primary` is a CSS color **or** an OKLCH hue. A hue-only input is the
issue's `primaryHue` sketch; a color string is the brand-paste path and
matches `seeds.json`. One seed drives both modes (dark is derived with
the existing dark lightness/chroma curves, not a second required input).

```ts
/** OKLCH hue in `[0, 360]` (`360` ≡ `0`), or a parseable sRGB/OKLCH/HSL CSS color. */
export type ColorSeed = number | string

export type ThemeDensity = 'compact' | 'comfortable' | 'spacious'
export type ElevationFlavor = 'subtle' | 'standard' | 'dramatic'
export type GradientFlavor = 'none' | 'subtle' | 'aurora'

export interface DefineThemeInput {
  /** `data-sl-theme` value. Kebab-case. Not `default`. */
  name: string
  primary: ColorSeed
  /** Neutral hue/color, or `'none'` for chroma 0. Default: primary hue, low chroma. */
  neutralTint?: ColorSeed | 'none'
  /** Defaults: current `default` theme status seeds (not derived from primary). */
  status?: {
    success?: ColorSeed
    warning?: ColorSeed
    danger?: ColorSeed
    info?: ColorSeed
  }
  /** `0` sharp → `1` designed (including pill). Default `1`. */
  roundness?: number
  /** Unset `data-sl-density` under this theme. Default `'comfortable'`. */
  density?: ThemeDensity
  /** Unitless duration scale. Default `1`. */
  motionIntensity?: number
  /** Shadow/lift recipe. Default `'standard'`. */
  elevation?: ElevationFlavor
  /** `gradient.accent` / aurora recipe. Default `'subtle'`. */
  gradient?: GradientFlavor
}

export interface DefinedTheme {
  name: string
  css: string
  tokens: TokenManifest['tokens']
  manifest: TokenManifest
}

export function defineTheme(input: DefineThemeInput): DefinedTheme
```

`TokenManifest` is the ADR 0007 JSON catalog (`theme` set to `input.name`).

**Defaults:** `neutralTint` from `primary`'s hue at library-neutral
chroma; `status` = today's success/warning/danger/info seeds; `roundness
= 1`; `density = 'comfortable'`; `motionIntensity = 1`; `elevation =
'standard'`; `gradient = 'subtle'`.

**Validation (throw, do not coerce):** `name` matches
`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/`, length ≤ 64, not `default`. Hue is
finite and in `[0, 360]` (`360` is equivalent to `0`). Color strings must
parse to an absolute color (`currentColor`, `inherit`, relative colors
rejected). `roundness` and `motionIntensity` in `[0, 1]`. Enums must be
exact. After fg auto-adjust, every WCAG AA pair from `evaluateContrast`
must pass or `defineTheme` throws.

```ts
import { defineTheme } from '@slop-ui/themes/define'
import { writeFileSync } from 'node:fs'

const acme = defineTheme({ name: 'acme', primary: '#0f766e', roundness: 0.5 })
writeFileSync('src/acme.css', acme.css)
```

```html
<main class="slop-theme" data-sl-theme="acme">…</main>
```

### 3. Apply and scope

Token sheets set properties on
`:where([data-sl-theme='<name>'])`. `.slop-theme` **without**
`data-sl-theme` continues to mean `default`. Implementation must stop
treating `.slop-themed-scope` as a token host (today it is in `CSS_HOST`,
which would pin themed wrappers to `default` inside a nested flagship).
`.slop-themed-scope` stays a recipe scope only.

`data-sl-mode` and `data-sl-density` stay orthogonal and nestable: a
descendant attribute wins. Generated CSS still follows
`prefers-color-scheme` when mode is unset. Theme CSS sets
`--sl-roundness` and `--sl-motion-intensity` on its host; nested hosts
override. A theme's `density` default is the unset-density rule **under
that `data-sl-theme` only**; global unset density on `default` remains
`comfortable`.

Recipes (`default.css` button/elevation/motion rules) stay theme-agnostic
and consume `--sl-*`. Flagship files are token sheets, not forks of
`default.css`. Import recipes plus every theme the page might show:

```ts
import '@slop-ui/themes/default.css'
import '@slop-ui/themes/calm.css'
import '@slop-ui/themes/vibrant.css'
import '@slop-ui/themes/mono.css'
```

**No-flash:** all used token sheets are in the document before first
paint; the host HTML already has `data-sl-theme` (SSG/SSR). Mode needs no
JS. Persisted docs/app choice may use a tiny blocking inline script that
writes `data-sl-theme` from `localStorage` before paint. Do not generate
or fetch theme CSS after hydrate as the supported path.
`startThemeTransition` remains mode-only; theme switches are
`setAttribute('data-sl-theme', name)` (callers may wrap the View
Transitions pattern themselves).

### 4. Flagships are checked-in `defineTheme` calls

Flagships are TypeScript configs compiled by the themes package build,
not parallel hand-tuned DTCG trees. That dogfoods the generator. `default`
stays authored DTCG (`seeds.json` + semantic overlays). Escape hatch: a
small DTCG overlay next to a flagship config only when a knob cannot
express a needed token.

```ts
defineTheme({
  name: 'calm',
  primary: 215,
  neutralTint: 215,
  roundness: 0.3,
  density: 'compact',
  motionIntensity: 0.6,
  elevation: 'subtle',
  gradient: 'none',
})

defineTheme({
  name: 'vibrant',
  primary: 292,
  neutralTint: 280,
  roundness: 1,
  density: 'comfortable',
  motionIntensity: 1,
  elevation: 'dramatic',
  gradient: 'aurora',
})

defineTheme({
  name: 'mono',
  primary: '#171717',
  neutralTint: 'none',
  roundness: 0,
  density: 'comfortable',
  motionIntensity: 0.45,
  elevation: 'subtle',
  gradient: 'none',
})
```

`mono` keeps default **status** hues so danger/success stay
distinguishable. Docs chrome dogfoods `calm` (`class="slop-theme"
data-sl-theme="calm"`) and ships a switcher for `default` | `calm` |
`vibrant` | `mono`.

### 5. Contrast: auto-adjust fg, then fail loudly

Keep the existing WCAG 2 AA gate (`4.5:1`, APCA advisory). The generator
does **not** mutate the caller's primary seed (anchor pin stays). It
walks each ramp to choose `*.fg` / on-color steps (and hover/active
pairs) that pass `evaluateContrast`. If no step works, **throw** — never
return CSS that `pnpm contrast` would reject. Shipped `default` +
flagships stay in `pnpm contrast`.

### 6. Package placement

Stay in `@slop-ui/themes`. No new package.

| Export                                             | Contents                                                        | Runtime                                          |
| -------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------------------ |
| `@slop-ui/themes`                                  | wrappers, `tokens`, `startThemeTransition`, flagship name union | browser; **no `defineTheme`**                    |
| `@slop-ui/themes/define`                           | `defineTheme` + types                                           | **Node only** (`exports.node` / documented Node) |
| `@slop-ui/themes/calm.css` (and `vibrant`, `mono`) | compiled token sheets                                           | CSS                                              |
| `@slop-ui/themes/default.css`                      | recipes + `default` tokens                                      | CSS                                              |

Main entry must not re-export `defineTheme`, so app bundles cannot pull
`culori` by accident. **New browser runtime dependency: none, unless Zac
approves an isomorphic generator.**

## Alternatives considered

**Runtime (browser) generation.** Rejected for v1. Bundle cost, SSR
flash, and a new runtime `culori` dependency. Revisit only with Zac's
approval.

**Hand-tuned DTCG overlays as the flagship source.** Rejected as the
ordinary path; the generator would be unproven. Overlays remain an escape
hatch.

**Hue-only `primaryHue`.** Rejected as the sole input. Brand guidelines
hand over hex; hue drops chroma and lightness. The union preserves the
sketch.

**Vite plugin as the public API.** Rejected. The function returning CSS is
the API; a plugin would wrap it later if Vite-only ergonomics demand it.

**Injecting `<style>` at runtime as the apply API.** Rejected. Fights
no-flash and duplicates `data-sl-theme` scoping.

**Deriving status hues from primary.** Rejected. Danger must not collapse
into the brand color.

## Consequences

- Node `defineTheme` lives at `@slop-ui/themes/define` (not the main
  entry). Flagship CSS is compiled at package build. `pnpm contrast`
  gates `default`, `calm`, `vibrant`, and `mono`. Docs chrome dogfoods
  `calm` and restores a persisted choice with a blocking inline script.
- `default` DTCG pipeline is unchanged.
- Nested themed wrappers inherit the nearest `data-sl-theme` because
  `.slop-themed-scope` is no longer a token host.

## Compatibility implications

Package is unpublished (`0.0.0`). Selector change for
`.slop-themed-scope` is required for nesting and is backwards-compatible
for `default` if `.slop-theme` / `[data-sl-theme='default']` keep
emitting the same variables. Headless `@slop-ui/vue` is unchanged. No
browser dependency added. Accessibility: AA remains a hard fail for every
generated theme.

## Decision record (Zac, 2026-11-11)

1. **Node-only.** `defineTheme` runs in Node. `culori` stays a
   `devDependency` of `@slop-ui/themes`. No new runtime dependency.
2. **Flagship names:** `calm`, `vibrant`, and `mono`.
3. **Docs chrome dogfoods `calm` on first paint.** `default` stays the
   published baseline theme.
4. **`default` stays hand-authored DTCG** for now.
5. **Ship `elevation` and `gradient` flavor knobs in v1.**
6. **A small blocking inline script in the docs is acceptable** to restore
   a persisted theme before paint.
