# GhostHoverCard

`GhostHoverCard` shows a rich preview on pointer hover or keyboard focus of a
trigger, with open and close delays so users can move onto interactive content.
Import `GhostHoverCard`, `GhostHoverCardTrigger`, and `GhostHoverCardContent`
from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the default
elevation surface.

## Basic use

<GhostExample id="hover-card/basic" />

## Themed use

<GhostExample id="hover-card/themed" />

`GhostHoverCard` owns `open` via `useControllableState`, assigns deterministic IDs
via `useGhostId`, applies open/close delays for WCAG 1.4.13, positions the
floating panel with `useFloating`, renders it through `GhostPortal` by default,
dismisses on `Escape` and outside pointerdown via `useDismissableLayer`, and
unmounts with `v-if` when closed.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

### `GhostHoverCard` (root)

Supports `openDelay`, `closeDelay`, and `closeOnEscape`. Emits `update:open` with
`(open: boolean)`. The default slot receives `{ open: boolean, close: () => void }`.

### `GhostHoverCardTrigger`

Sets `type="button"` (when `as="button"`), `aria-haspopup="dialog"`,
`aria-expanded`, and `aria-controls`, `data-part="trigger"`, and
`data-state="open" | "closed"`. Schedules show on `pointerenter` / `focusin` and
hide on `pointerleave` / `focusout` when not `disabled`. Exposes
`{ element, focus, blur }`.

### `GhostHoverCardContent`

Keeps `visibility: hidden` until `useFloating().isPositioned` resolves. Sets
`role="dialog"`, `tabindex="-1"`, `data-part="content"`, `data-hoverable`,
`data-state="open"`, and `data-placement`. Interactive descendants are allowed.
Exposes `{ element, focus, blur }`.

## Accessibility

- **Preview semantics:** The trigger exposes `aria-expanded` and names the
  associated dialog surface via `aria-controls` / `aria-labelledby`.
- **WCAG 1.4.13:** `closeDelay` preserves a grace period before hiding; pointer
  movement onto the card keeps it open while the trigger stays focused.
- **Dismissal:** `Escape` and outside pointerdown close the card without trapping
  focus. Tab moves through focusable content inside the card.

## Specification

See [GhostHoverCard specification](/specs/hover-card) and
[ADR 0011](../adr/0011-overlay-primitives.md).
