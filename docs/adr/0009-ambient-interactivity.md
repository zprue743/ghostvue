# ADR 0009: Ambient interactivity for 'alive' surfaces

Identifiers updated for the GhostVue rebrand (ADR 0010).

- Status: accepted
- Date: 2026-11-11
- Decision owners: Zac Pruett, repository maintainers
- Relates to: [ADR 0004](./0004-headless-styled-layering.md) (layering),
  [ADR 0007](./0007-token-pipeline.md) (tokens, `--ghost-motion-intensity`),
  [ADR 0008](./0008-define-theme.md) (flagships); SLO-62

Accepted 2026-11-11 with the answers in
[Decision record](#decision-record-zac-2026-11-11). v1 ships **spotlight
only**; tilt and magnetic are follow-ups.

## Context

SLO-62 asks for surfaces that react to the pointer so the UI feels alive.
The inspiration is [particles.js](https://vincentgarreau.com/particles.js/) —
ambient response to presence, not a particle-field clone. `--ghost-motion-intensity`
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

**Pointer spotlight and glow.** The composable writes `--ghost-pointer-x` /
`--ghost-pointer-y` (and unitless `--ghost-pointer-nx` / `--ghost-pointer-ny`). Theme
CSS paints a glow on a `data-part="glow"` layer whose `transform` and
`opacity` follow those variables. This is the particles.js _feeling_ — the
surface notices you — at a fraction of the cost. Paint stays on one
composited layer. **First effect to productize.**

**Magnetic pull and tilt.** The same pointer normals drive
`--ghost-magnetic-x` / `--ghost-magnetic-y` and `--ghost-tilt-x` / `--ghost-tilt-y`.
An inner face uses `transform` only. While tracking, transitions are instant
so the face follows the pointer; on leave, `--ghost-motion-spring-snappy`
settles back. Intensity scales the amplitudes through `calc()`. **Second
effect; opt-in per surface, never a global default.**

**Ambient canvas / WebGL backgrounds.** True particle fields, trails, and
shader backdrops. They fight the token model (colors and motion cease to be
`--ghost-*` assignments), need a frame loop even at rest, and invite a runtime
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

1. **`useGhostInteractiveSurface` only.** Headless, tree-shakeable, SSR-safe.
   Consumers spread `rootProps` and own markup. Matches `useGhostButton`.
   Themed use then requires a class, a recipe attribute, and a stylesheet —
   the same gap ADR 0004 rejected as the _only_ public unit.
2. **Themed `GhostInteractiveSurface` / `GhostAmbient` only.** Easy for docs and
   marketing pages; hostile to headless consumers and to attaching the
   effect to an existing `GhostButton` or card the app already owns.
3. **Theme-level only** (`data-interactive` plus tokens, no JS). CSS cannot
   read pointer position. Rejected as a complete solution. Recipes remain
   the _visual_ half.
4. **Composable + recipes + optional themed wrapper (recommended).** Same
   three-layer split as Button. Visual props (`spotlight`, `tilt`,
   `magnetic`) live only on the themed wrapper. Headless markup uses
   `data-interactive` and the composable. No `pt` object.

**Recommendation:** option 4. Public names follow ADR 0003:
`useGhostInteractiveSurface`, unstyled `GhostInteractiveSurface` in `@ghostvue/vue`,
themed wrapper in `@ghostvue/themes`. Do not name it `GhostAmbient` — that
sounds like a page background. Recipes use `data-interactive` with
space-separated effects (`spotlight`, `tilt`, `magnetic`), matching
`data-elevation` / `data-motion`. `data-state` is `off` | `idle` |
`tracking`.

Proposed (not shipped) sketch:

```ts
export type InteractiveEffect = 'spotlight' | 'tilt' | 'magnetic'

export function useGhostInteractiveSurface(
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
<GhostInteractiveSurface effects="spotlight">…</GhostInteractiveSurface>
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
follow `--ghost-<role>-<part>-<state>`:

| Token                           | Role                                     |
| ------------------------------- | ---------------------------------------- |
| `interactive.spotlight.size`    | Glow diameter                            |
| `interactive.spotlight.opacity` | Peak glow opacity                        |
| `interactive.spotlight.color`   | Glow color, alias of `action.primary.bg` |
| `interactive.tilt.max`          | Max `rotateX`/`rotateY` in degrees       |
| `interactive.magnetic.distance` | Max translate in px                      |
| `interactive.leave.spring`      | Alias of `motion.spring.snappy`          |

Amplitudes multiply by `--ghost-motion-intensity`. Flagships tune the tokens,
not a second API:

| Theme                             | Spotlight               | Tilt       | Magnetic |
| --------------------------------- | ----------------------- | ---------- | -------- |
| **calm** (`motionIntensity: 0.6`) | Low opacity, small size | `0`        | Subtle   |
| **vibrant** (`1`, aurora)         | Strong, large           | Expressive | Strong   |
| **mono** (`0.45`, no chroma)      | Neutral hairline glow   | `0`        | `0`      |

`defineTheme` grows `interactivity: 'none' | 'subtle' | 'expressive'`
alongside `elevation` and `gradient`. Authored `default` matches **subtle**.
**none** zeros size and opacity. **expressive** enlarges the glow. Flagships:
calm and mono use subtle (mono’s chroma-0 primary is the hairline color);
vibrant uses expressive. Tilt and magnetic stay follow-ups.

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

- `@ghostvue/vue` exports `useGhostInteractiveSurface` and unstyled
  `GhostInteractiveSurface`. `@ghostvue/themes` exports a themed wrapper and a
  `data-interactive='spotlight'` recipe. Themed `GhostButton` opts in with
  `interactive="spotlight"` (`data-interactive`), off by default.
- Magnetic/tilt and any particle/WebGL background are follow-ups (tilt on
  the same composable; particles only in a separate opt-in package).
- `--ghost-motion-intensity: 0` already freezes amplitudes via `calc()`.

## Compatibility implications

Additive. Package is unpublished (`0.0.0`). Headless `GhostButton` is unchanged.
Themed `GhostButton` gains an optional `interactive` prop; omitting it leaves
markup and snapshots identical. No new runtime dependency.

## Decision record (Zac, 2026-11-11)

1. **`GhostButton` opt-in.** Themed `GhostButton` may set `data-interactive="spotlight"`.
   Off by default. Not a global button treatment.
2. **CSS vars + existing springs in v1.** Pointer tracking writes CSS
   variables; leave uses `--ghost-interactive-leave-spring` (`linear()` from
   SLO-65). A JS spring integrator is a follow-up only if tracking feels
   weightless.
3. **Coarse pointers are fully off.** No static centered glow.
4. **Budget, not invariant.** One active tracking surface is documented.
   The library does not enforce a singleton.
5. **`defineTheme` knob.** `interactivity: 'none' | 'subtle' | 'expressive'`
   maps onto the spotlight tokens, parallel to `elevation` / `gradient`.
6. **Canvas/WebGL stay playground-only.** A future particle background would
   be a separate opt-in package, not part of `@ghostvue/vue` or
   `@ghostvue/themes`.
