# ADR 0009: Ambient interactivity for 'alive' surfaces

- Status: proposed
- Date: 2026-11-11
- Decision owners: Zac Pruett, repository maintainers
- Relates to: [ADR 0004](./0004-headless-styled-layering.md) (layering),
  [ADR 0007](./0007-token-pipeline.md) (tokens, `--sl-motion-intensity`),
  [ADR 0008](./0008-define-theme.md) (flagships); SLO-62

This is a design spike. Nothing here is a published API.

## Context

SLO-62 asks for surfaces that react to the pointer so the UI feels alive.
The inspiration is [particles.js](https://vincentgarreau.com/particles.js/) —
ambient response to presence, not a particle-field clone. `--sl-motion-intensity`
already scales duration; reduced-motion overlays already exist. The missing
piece is pointer-driven motion that still fits headless-plus-themed layering:
composables wrap into themed components, styling is `data-part` / `data-state`
plus CSS variables, no passthrough objects, every visual value from tokens.

Constraints this spike must not violate: `vue` does not import `themes`; no
`pt` props; no new runtime dependency; SSR setup must not touch `window`;
effects must not be the sole carrier of information.

## Decision

Ship pointer reactivity as a **headless composable** that writes CSS variables
onto a host, plus **theme recipes** that consume those variables. Add an
optional themed wrapper later for the easy call site. Do not ship canvas,
WebGL, or a particle system in the library.

### Effect survey

**Pointer spotlight and glow.** The composable writes `--sl-pointer-x` /
`--sl-pointer-y` (and unitless `--sl-pointer-nx` / `--sl-pointer-ny`). Theme
CSS paints a glow on a `data-part="glow"` layer whose `transform` and
`opacity` follow those variables. This is the particles.js _feeling_ — the
surface notices you — at a fraction of the cost. Paint stays on one
composited layer. **First effect to productize.**

**Magnetic pull and tilt.** The same pointer normals drive
`--sl-magnetic-x` / `--sl-magnetic-y` and `--sl-tilt-x` / `--sl-tilt-y`.
An inner face uses `transform` only. While tracking, transitions are instant
so the face follows the pointer; on leave, `--sl-motion-spring-snappy`
settles back. Intensity scales the amplitudes through `calc()`. **Second
effect; opt-in per surface, never a global default.**

**Ambient canvas / WebGL backgrounds.** True particle fields, trails, and
shader backdrops. They fight the token model (colors and motion cease to be
`--sl-*` assignments), need a frame loop even at rest, and invite a runtime
dependency. Playground experiments may try them; **they are not a library
feature.**

**Spring physics.** SLO-65 already compiles mass-spring-damper triples to
CSS `linear()` plus settle duration. That is the right tool for discrete
arrivals and the leave settle. Continuous pointer tracking should **not**
run a JS integrator in v1: CSS-var writes plus the existing spring on leave
are enough. Revisit a JS integrator only if tracking itself must feel
massy.

### API shape

Options considered:

1. **`useSlInteractiveSurface` only.** Headless, tree-shakeable, SSR-safe.
   Consumers spread `rootProps` and own markup. Matches `useSlButton`.
   Themed use then requires a class, a recipe attribute, and a stylesheet —
   the same gap ADR 0004 rejected as the _only_ public unit.
2. **Themed `SlInteractiveSurface` / `SlAmbient` only.** Easy for docs and
   marketing pages; hostile to headless consumers and to attaching the
   effect to an existing `SlButton` or card the app already owns.
3. **Theme-level only** (`data-interactive` plus tokens, no JS). CSS cannot
   read pointer position. Rejected as a complete solution. Recipes remain
   the _visual_ half.
4. **Composable + recipes + optional themed wrapper (recommended).** Same
   three-layer split as Button. Visual props (`spotlight`, `tilt`,
   `magnetic`) live only on the themed wrapper. Headless markup uses
   `data-interactive` and the composable. No `pt` object.

**Recommendation:** option 4. Public names follow ADR 0003:
`useSlInteractiveSurface`, unstyled `SlInteractiveSurface` in `@slop-ui/vue`,
themed wrapper in `@slop-ui/themes`. Do not name it `SlAmbient` — that
sounds like a page background. Recipes use `data-interactive` with
space-separated effects (`spotlight`, `tilt`, `magnetic`), matching
`data-elevation` / `data-motion`. `data-state` is `off` | `idle` |
`tracking`.

Proposed (not shipped) sketch:

```ts
export type InteractiveEffect = 'spotlight' | 'tilt' | 'magnetic'

export function useSlInteractiveSurface(
  target: MaybeRefOrGetter<HTMLElement | null | undefined>,
  options?: { effects?: MaybeRefOrGetter<readonly InteractiveEffect[]> },
): {
  rootProps: ComputedRef<{
    'data-part': 'root'
    'data-interactive': string
    'data-state': 'off' | 'idle' | 'tracking'
  }>
}
```

```vue
<SlInteractiveSurface effects="spotlight">…</SlInteractiveSurface>
```

The composable writes CSS variables **imperatively** on the host (not via
Vue `style` each frame) so pointer motion does not invalidate reactive
subtrees. Bindings cover attributes only.

### Performance budget

- **60fps on mid-range hardware** for one tracking surface. Spotlight uses a
  transformed glow layer; tilt/magnetic use `transform` on an inner face.
  No `top`/`left`, no `box-shadow` animation, no `filter` on the host.
- **Zero work when offscreen** (`IntersectionObserver`) **or when the tab is
  hidden** (`visibilitychange`). Cancel the rAF and drop pointer sampling.
- **rAF-batch pointer handling.** `pointermove` records coordinates only;
  one rAF consumes the latest sample. Listeners are `passive`.
- **No layout thrash.** Cache `getBoundingClientRect` on enter / resize /
  scroll-dirty; never per `pointermove`. Measure a static host, not the
  transformed face, so magnetic travel cannot feedback into the rect.
- **Writes:** CSS custom properties, `transform`, and `opacity` on layers
  that already have `will-change` while `data-state="tracking"`.
- **Budget:** one tracking surface is the expected case. Do not attach the
  composable to every control in a dense toolbar.

### Accessibility

- **`prefers-reduced-motion: reduce` turns the effect fully off**
  (`data-state="off"`, no listeners, no glow). Not a fade — off.
- **Never the sole carrier of information.** Spotlight and tilt are
  decoration. Focus, selection, and status stay in native semantics and
  `data-state` that already exists on the control.
- **SSR-safe.** No `window` / `document` / `matchMedia` at import. Observers
  and listeners attach in `onMounted` and release on unmount, matching
  `useFocusScope`.
- **Coarse pointer:** this spike disables tracking (`pointer: coarse`).
  Touch scrolling must not fight a tilt. Whether a static centered glow
  remains is an open question.
- **Forced colors:** recipes must drop decorative glow, same as elevation
  materials.

### Theming hooks

Proposed semantic tokens (not authored in this spike). Public CSS names
follow `--sl-<role>-<part>-<state>`:

| Token                           | Role                                     |
| ------------------------------- | ---------------------------------------- |
| `interactive.spotlight.size`    | Glow diameter                            |
| `interactive.spotlight.opacity` | Peak glow opacity                        |
| `interactive.spotlight.color`   | Glow color, alias of `action.primary.bg` |
| `interactive.tilt.max`          | Max `rotateX`/`rotateY` in degrees       |
| `interactive.magnetic.distance` | Max translate in px                      |
| `interactive.leave.spring`      | Alias of `motion.spring.snappy`          |

Amplitudes multiply by `--sl-motion-intensity`. Flagships tune the tokens,
not a second API:

| Theme                             | Spotlight               | Tilt       | Magnetic |
| --------------------------------- | ----------------------- | ---------- | -------- |
| **calm** (`motionIntensity: 0.6`) | Low opacity, small size | `0`        | Subtle   |
| **vibrant** (`1`, aurora)         | Strong, large           | Expressive | Strong   |
| **mono** (`0.45`, no chroma)      | Neutral hairline glow   | `0`        | `0`      |

`defineTheme` does not need a new knob in v1. Flagship configs override the
semantic tokens. A future `interactivity: 'none' \| 'subtle' \| 'expressive'`
flavor is optional, parallel to `elevation` / `gradient`.

## Alternatives considered

**particles.js / canvas field as the default.** Rejected. Not token-driven,
not SSR-safe at import, and the request is the _feeling_, not the clone.

**Theme data attributes with no composable.** Rejected. Pointer position is
not available to CSS.

**JS spring integrator in v1.** Rejected until tracking-while-down needs
mass. SLO-65 springs already cover leave.

**PrimeVue-style `pt` for glow layers.** Rejected by ADR 0004.

**Putting the composable in `themes`.** Rejected. Behavior and lifecycle
belong in `vue`; `vue` must not import `themes`.

## Consequences

- Playground prototypes (`apps/playground`) prove spotlight and
  tilt/magnetic against the budget. They are not exports.
- A follow-up that productizes this needs a spec, tests, docs, a manifest,
  token JSON, recipes in `recipes.css`, and a Changeset. This ADR stays
  `proposed` until Zac answers the questions below.
- `--sl-motion-intensity: 0` already freezes amplitudes via `calc()`.

## Compatibility implications

Docs and playground only. No published API, no Changeset. Headless `@slop-ui/vue`
is unchanged. Introducing `useSlInteractiveSurface` later is additive.

## Open questions for Zac

1. Should pointer-reactive effects ever ship on `SlButton` itself, or only as an opt-in surface wrapper?
2. Is a JS spring integrator (reading authored mass/stiffness/damping) in scope later, or is CSS-var tracking plus `linear()` settle-on-leave enough?
3. Coarse-pointer: fully off, or a static centered glow?
4. One tracking surface at a time as a hard library invariant, or a documented budget?
5. Should `defineTheme` grow an `interactivity` flavor knob (`none` | `subtle` | `expressive`) alongside elevation/gradient, or only tokens that flagships override?
6. Canvas/WebGL ambient backgrounds: never in the library, or a documented playground-only experiment?
