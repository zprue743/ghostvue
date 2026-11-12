# GhostInteractiveSurface

Pointer spotlight for surfaces that should notice the cursor. Import the
unstyled primitive from `@ghostvue/vue`, or the themed wrapper from
`@ghostvue/themes`. v1 is **spotlight only**; tilt and magnetic are
follow-ups. See [ADR 0009](../adr/0009-ambient-interactivity.md).

## Basic use

<GhostExample id="interactive-surface/basic" />

Headless use of the same contract without the SFC:

<GhostExample id="interactive-surface/composable" />

## API

| Prop      | Type                                         | Default         | Description                                             |
| --------- | -------------------------------------------- | --------------- | ------------------------------------------------------- |
| `as`      | `'div' \| 'article' \| 'section' \| 'aside'` | `'div'`         | Root tag.                                               |
| `effects` | `InteractiveEffect[]`                        | `['spotlight']` | Recipes on `data-interactive`. v1 supports `spotlight`. |

`InteractiveEffect` is `'spotlight'`. Native attributes fall through to the
root. The default slot is the content. A template ref exposes `element`.

`useGhostInteractiveSurface(target, options?)` also accepts `stateAttribute`
(`'data-state'` or `'data-interactive-state'`) for hosts that already own
`data-state`. It writes `--ghost-pointer-x` / `--ghost-pointer-y` (px) and
unitless `--ghost-pointer-nx` / `--ghost-pointer-ny` on the host.

## Themed GhostButton opt-in

Themed `GhostButton` stays inert unless you pass `interactive="spotlight"`.
Off by default — existing screenshots do not change.

<GhostExample id="interactive-surface/button" />

That sets `data-interactive="spotlight"` and tracks on
`data-interactive-state` so loading and disabled keep `data-state`.

## Theme knob

`defineTheme({ interactivity: 'none' | 'subtle' | 'expressive' })` maps onto
`interactive.spotlight.size` and `interactive.spotlight.opacity`. The
authored default is **subtle** (`10rem` / `0.28`). **none** zeros the glow.
**expressive** enlarges it (`20rem` / `0.75`). Flagships: calm and mono use
subtle (mono’s chroma-0 primary is the hairline color); vibrant uses
expressive.

## Styling

Recipes key off `data-interactive~='spotlight'` and `data-part="glow"`.
Peak opacity is
`calc(var(--ghost-interactive-spotlight-opacity) * var(--ghost-motion-intensity, 1))`.
Leave settles with `--ghost-interactive-leave-spring`. Forced colors and
`prefers-reduced-motion: reduce` drop the glow. Coarse pointers never
track.

One active tracking surface is the expected case. The library does not
enforce a singleton.

## Accessibility and environment behavior

Spotlight is decoration. Reduced motion and coarse pointers are fully off.
SSR markup is `data-state="off"`; capable surfaces become `idle` after
mount. Setup does not read browser globals.

See the [approved specification](./interactive-surface-spec.md).
