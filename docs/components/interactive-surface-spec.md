# SlInteractiveSurface specification

**Status:** Approved with ADR 0009 (accepted 2026-11-11). v1 ships
spotlight only; tilt and magnetic are follow-ups.

## Purpose and user problems

`SlInteractiveSurface` makes a host notice the pointer. A glow follows the
cursor so a card or opted-in control feels alive. The effect is decoration.
Focus, selection, and status stay on the host's existing semantics.

## Non-goals

- Tilt and magnetic pull. Same composable later; not in v1.
- Canvas, WebGL, or particle fields. Playground-only; a future particle
  background would be a separate opt-in package.
- A JS spring integrator. Leave uses the existing CSS `linear()` spring.
- A singleton that forbids more than one tracking surface. One active
  surface is a documented budget, not an invariant.
- Changing themed `SlButton` by default. Spotlight is opt-in.

## Public API

### Props and configuration

Headless `@slop-ui/vue` `SlInteractiveSurface` / `useSlInteractiveSurface`:

| Prop / option    | Type                                         | Default         | Contract                                                                                             |
| ---------------- | -------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------- |
| `as`             | `'div' \| 'article' \| 'section' \| 'aside'` | `'div'`         | Root tag on the unstyled SFC. Not an option on the composable.                                       |
| `effects`        | `InteractiveEffect[]`                        | `['spotlight']` | Recipes on `data-interactive`. v1 is `'spotlight'` only. An empty list is an explicit off.           |
| `stateAttribute` | `'data-state' \| 'data-interactive-state'`   | `'data-state'`  | Composable-only. Hosts that already own `data-state` (themed SlButton) use `data-interactive-state`. |

```ts
export type InteractiveEffect = 'spotlight'
export type InteractiveSurfaceState = 'off' | 'idle' | 'tracking'
```

Named ESM exports: `SlInteractiveSurface`, `useSlInteractiveSurface`, and
the types above. Native attributes fall through to the root. There is no
`pt` object.

Themed `@slop-ui/themes` `SlInteractiveSurface` wraps the unstyled
component in `.slop-themed-scope` and re-exports `as` and `effects`. Visual
values come from `interactive.spotlight.*` tokens and the
`data-interactive='spotlight'` recipe.

Themed `SlButton` gains `interactive?: 'spotlight'`. Omitting it leaves
markup identical to today.

### v-model contracts

None. Tracking is derived from the pointer, reduced motion, and pointer
accuracy.

### Events, callbacks, slots, and exposed methods

The default slot is the content. The unstyled SFC always renders an
`aria-hidden` `data-part="glow"` sibling; that layer is not a public slot.
No component events. A template ref exposes `element: HTMLElement | null`.

`useSlInteractiveSurface` returns `rootProps` for `data-part`,
`data-interactive`, and the chosen state attribute. CSS variables
`--sl-pointer-x`, `--sl-pointer-y`, `--sl-pointer-nx`, and `--sl-pointer-ny`
are written on the host imperatively so pointer motion does not invalidate
Vue subtrees.

## State model

`off` → no listeners, no glow. `idle` → capable, at rest. `tracking` →
pointer is over the host.

Reduced motion and coarse pointers force `off`. Hidden tabs and
off-screen hosts cancel the frame loop and return to `idle` if they were
tracking. Empty `effects` is `off`.

### Loading, empty, disabled, read-only, and error states

None of these belong to the surface. On a themed `SlButton`, loading and
disabled stay on `data-state`; spotlight uses `data-interactive-state`.

## Accessibility contract

Spotlight is never the sole carrier of information. The glow is
`aria-hidden`. `prefers-reduced-motion: reduce` turns the effect fully
off, not a fade. Coarse pointers are fully off — no static centered glow.
Forced colors drop the glow. Keyboard focus is unchanged.

## Rendering and customization

Stable hooks: `data-part="root"`, `data-part="glow"`, `data-interactive`,
`data-state` or `data-interactive-state`, and the `--sl-pointer-*` /
`--sl-interactive-spotlight-*` variables. Recipes live in `recipes.css`.

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

`useSlInteractiveSurface` owns sampling and attributes. Unstyled
`SlInteractiveSurface` spreads those onto `as`. The themed wrapper scopes
CSS. Themed `SlButton` opts in with `interactive="spotlight"`.

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

Additive minor Changesets for `@slop-ui/vue` and `@slop-ui/themes`.
Existing themed `SlButton` snapshots stay unchanged when the prop is
omitted.
