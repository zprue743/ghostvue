# GhostTooltip

`GhostTooltip` shows supplemental description text on pointer hover or keyboard
focus without moving focus. Import `GhostTooltip`, `GhostTooltipTrigger`, and
`GhostTooltipContent` from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default compact elevation surface.

## Basic use

<GhostExample id="tooltip/basic" />

`GhostTooltip` owns `open` via `useControllableState`, assigns deterministic IDs
via `useGhostId`, applies open/close delays for WCAG 1.4.13, positions the
floating label with `useFloating`, renders it through `GhostPortal` by default,
unmounts it with `v-if` when closed, and dismisses on `Escape`.

## Themed use

<GhostExample id="tooltip/themed" />

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-tooltip-content` with elevation-2 surface, hairline border, radius,
inset padding, and small type tokens. Tooltip content uses
`pointer-events: none` so it never intercepts pointer input.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

### `GhostTooltip` (root)

Supports `delayDuration`, `closeDelay`, and `disableHoverableContent`.
Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean }`.

### `GhostTooltipTrigger`

Sets `type="button"` (when `as="button"`), `aria-describedby` merging consumer
ids with the tooltip id while open,
`data-part="trigger"`, and `data-state="open" | "closed"`. Schedules show on
`pointerenter` / `focusin` and hide on `pointerleave` / `focusout` when not
`disabled`. Exposes `{ element, focus, blur }`.

### `GhostTooltipContent`

Keeps `visibility: hidden` until `useFloating().isPositioned` resolves. Sets
`role="tooltip"`, `data-part="content"`, `data-state="open"`, and
`data-placement`. Must not contain focusable descendants. Exposes
`{ element, focus, blur }`.

## Accessibility

- **Supplemental descriptions:** `aria-describedby` links the trigger to
  tooltip text while open; tooltips must not be the only source of required
  information.
- **WCAG 1.4.13:** `closeDelay` preserves a grace period before hiding;
  hoverable content keeps the tooltip open while the pointer is over the trigger,
  content, or while the trigger stays focused. Press `Escape` to dismiss immediately.
- **No focus theft:** Opening does not move focus; tooltip content is not
  tabbable.

## Specification

See [GhostTooltip specification](./tooltip-spec.md) and
[ADR 0011](../adr/0011-overlay-primitives.md).
