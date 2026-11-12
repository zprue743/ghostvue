# GhostInteractiveSurface specification

**Status:** Approved with ADR 0009 (accepted 2026-11-11). v1 ships
spotlight only; tilt and magnetic are follow-ups.

## Purpose and user problems

`GhostInteractiveSurface` makes a host notice the pointer. A glow follows the
cursor so a card or opted-in control feels alive. The effect is decoration.
Focus, selection, and status stay on the host's existing semantics.

## Non-goals

- Tilt and magnetic pull. Same composable later; not in v1.
- Canvas, WebGL, or particle fields. Playground-only; a future particle
  background would be a separate opt-in package.
- A JS spring integrator. Leave uses the existing CSS `linear()` spring.
- A singleton that forbids more than one tracking surface. One active
  surface is a documented budget, not an invariant.
- Changing themed `GhostButton` by default. Spotlight is opt-in.

## Public API

### Props and configuration

Headless `@ghostvue/vue` `GhostInteractiveSurface` / `useGhostInteractiveSurface`:

| Prop / option    | Type                                         | Default         | Contract                                                                                                |
| ---------------- | -------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------- |
| `as`             | `'div' \| 'article' \| 'section' \| 'aside'` | `'div'`         | Root tag on the unstyled SFC. Not an option on the composable.                                          |
| `effects`        | `InteractiveEffect[]`                        | `['spotlight']` | Recipes on `data-interactive`. v1 is `'spotlight'` only. An empty list is an explicit off.              |
| `stateAttribute` | `'data-state' \| 'data-interactive-state'`   | `'data-state'`  | Composable-only. Hosts that already own `data-state` (themed GhostButton) use `data-interactive-state`. |

```ts
export type InteractiveEffect = 'spotlight'
export type InteractiveSurfaceState = 'off' | 'idle' | 'tracking'
```

Named ESM exports: `GhostInteractiveSurface`, `useGhostInteractiveSurface`, and
the types above. Native attributes fall through to the root. There is no
`pt` object.

Themed `@ghostvue/themes` `GhostInteractiveSurface` wraps the unstyled
component in `.ghost-themed-scope` and re-exports `as` and `effects`. Visual
values come from `interactive.spotlight.*` tokens and the
`data-interactive='spotlight'` recipe.

Themed `GhostButton` gains `interactive?: 'spotlight'`. Omitting it leaves
markup identical to today.

### v-model contracts

None. Tracking is derived from the pointer, reduced motion, and pointer
accuracy.

### Events, callbacks, slots, and exposed methods

The default slot is the content. The unstyled SFC always renders an
`aria-hidden` `data-part="glow"` sibling; that layer is not a public slot.
No component events. A template ref exposes `element: HTMLElement | null`.

`useGhostInteractiveSurface` returns `rootProps` for `data-part`,
`data-interactive`, and the chosen state attribute. CSS variables
`--ghost-pointer-x`, `--ghost-pointer-y`, `--ghost-pointer-nx`, and `--ghost-pointer-ny`
are written on the host imperatively so pointer motion does not invalidate
Vue subtrees.

## State model

`off` → no listeners, no glow. `idle` → capable, at rest. `tracking` →
pointer is over the host.

Reduced motion and coarse pointers force `off`. Hidden tabs and
off-screen hosts cancel the frame loop and return to `idle` if they were
tracking. Empty `effects` is `off`.

### Loading, empty, disabled, read-only, and error states

None of these belong to the surface. On a themed `GhostButton`, loading and
disabled stay on `data-state`; spotlight uses `data-interactive-state`.

## Accessibility contract

Spotlight is never the sole carrier of information. The glow is
`aria-hidden`. `prefers-reduced-motion: reduce` turns the effect fully
off, not a fade. Coarse pointers are fully off — no static centered glow.
Forced colors drop the glow. Keyboard focus is unchanged.

## Rendering and customization

Stable hooks: `data-part="root"`, `data-part="glow"`, `data-interactive`,
`data-state` or `data-interactive-state`, and the `--ghost-pointer-*` /
`--ghost-interactive-spotlight-*` variables. Recipes live in `recipes.css`.

## Environment behavior

### SSR and hydration

Setup does not read `window` / `document` / `matchMedia`. SSR markup is
`data-state="off"`. After mount, a capable surface becomes `idle`.

### Mobile and touch

`pointer: coarse` disables tracking so scrolling does not fight a glow.

## Performance

rAF-batched pointer writes, cached rects (invalidate on resize/scroll),
`IntersectionObserver` plus `visibilitychange` pause. One tracking surface
is the expected case.

## Composition

`useGhostInteractiveSurface` owns sampling and attributes. Unstyled
`GhostInteractiveSurface` spreads those onto `as`. The themed wrapper scopes
CSS. Themed `GhostButton` opts in with `interactive="spotlight"`.

## Test plan

- Vue tests: state transitions, reduced motion, coarse pointer, empty
  effects, cleanup, SSR, button opt-in vs default.
- Browser tests: pointer CSS variables, reduced-motion off, opted-in
  snapshot.
- `defineTheme` tests for `interactivity: 'none' | 'subtle' | 'expressive'`.

## Documentation plan

API reference with a live demo, themed button opt-in, token knob, and a
link to ADR 0009. Playground exercises the published API.

## Compatibility and release impact

Additive minor Changesets for `@ghostvue/vue` and `@ghostvue/themes`.
Existing themed `GhostButton` snapshots stay unchanged when the prop is
omitted.
