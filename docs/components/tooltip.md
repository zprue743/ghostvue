# GhostTooltip

`GhostTooltip` shows supplemental description text on pointer hover or keyboard
focus without moving focus. Import `GhostTooltip`, `GhostTooltipTrigger`, and
`GhostTooltipContent` from `@ghostvue/vue` for headless use, or from
`@ghostvue/themes` for the default compact elevation surface.

<GhostExample id="tooltip/themed" />

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-tooltip-content` with elevation-2 surface, hairline border, radius,
inset padding, and small type tokens. Tooltip content uses
`pointer-events: none` so it never intercepts pointer input unless hoverable
content is enabled.

## Basic use

<GhostExample id="tooltip/basic" />

## Shared provider and skip delay

Wrap several tooltips in `GhostTooltipProvider` so moving the pointer between
nearby triggers skips the open delay within `skipDelayDuration` after the
previous tooltip closes. The first tooltip in a provider still waits the full
delay; keyboard focus keeps per-root timing.

<GhostExample id="tooltip-provider/skip-delay" />

`GhostTooltip` owns `open` via `useControllableState`, assigns deterministic IDs
via `useGhostId`, applies open/close delays for WCAG 1.4.13, positions the
floating label with `useFloating`, renders it through `GhostPortal` by default,
unmounts it with `v-if` when closed, and dismisses on `Escape`.

An open tooltip joins the shared overlay layer stack for `Escape` only. When a
tooltip is open inside (or above) a `GhostDialog`, `GhostPopover`, or menu, one
`Escape` closes just the topmost open overlay: the tooltip closes first and a
second `Escape` reaches the dialog. Tooltips never act as a modal or
click-away layer: pressing outside still dismisses the dialog or popover
beneath an open tooltip, and pressing the tooltip itself does not. Calling
`event.preventDefault()` on `Escape` (or pressing it during IME composition)
leaves every layer open.

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
  content, or while the trigger stays focused. Press `Escape` to dismiss immediately;
  inside a dialog or popover, the first `Escape` closes only the tooltip.
- **No focus theft:** Opening does not move focus; tooltip content is not
  tabbable.

## Specification

See [GhostTooltip specification](/specs/tooltip) and
[ADR 0011](../adr/0011-overlay-primitives.md).
