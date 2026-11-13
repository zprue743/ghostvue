# GhostPopover

`GhostPopover` renders a floating, non-modal disclosure dialog anchored to a
trigger control. Import `GhostPopover`, `GhostPopoverTrigger`,
`GhostPopoverContent`, and `GhostPopoverClose` from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for the default elevated surface.

## Basic use

<GhostExample id="popover/basic" />

`GhostPopover` owns `open` via `useControllableState`, assigns deterministic IDs
via `useGhostId`, positions the floating panel with `useFloating`, renders it
through `GhostPortal` by default, unmounts it with `v-if` when closed, handles
`Escape` and outside `pointerdown` through `useDismissableLayer`, and manages
non-modal entry/return focus through `useFocusScope`.

## Themed use

<GhostExample id="popover/themed" />

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-popover-content` with elevation-3 surface, border, hairline width,
radius, inset padding, and focus-ring `--ghost-*` tokens. Composing
`:as="GhostButton"` delegates trigger and close styling to themed buttons while
keeping anchor measurement on the inner `<button>` element.

## API

### `GhostPopover` (root)

| Prop          | Type      | Default     | Description                                        |
| ------------- | --------- | ----------- | -------------------------------------------------- |
| `open`        | `boolean` | `undefined` | Controlled open state. Omit for uncontrolled mode. |
| `defaultOpen` | `boolean` | `false`     | Initial open state when running uncontrolled.      |

Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean, close: () => void }`.

### `GhostPopoverTrigger`

| Prop       | Type                  | Default    | Description                                         |
| ---------- | --------------------- | ---------- | --------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | Root element tag or button component.               |
| `disabled` | `boolean`             | `false`    | Prevents toggling on click and keyboard activation. |

Sets `type="button"` (when `as="button"`), `aria-haspopup="dialog"`,
`aria-expanded`, `aria-controls`, `data-part="trigger"`, and
`data-state="open" | "closed"`. Exposes `{ element, focus, blur }`.

### `GhostPopoverContent`

| Prop        | Type                                   | Default      | Description                                                                    |
| ----------- | -------------------------------------- | ------------ | ------------------------------------------------------------------------------ |
| `as`        | `string \| Component`                  | `'div'`      | Element tag or component for the dialog surface.                               |
| `placement` | `GhostPopoverPlacement` (`Placement`)  | `'bottom'`   | Preferred placement relative to the trigger.                                   |
| `offset`    | `GhostPopoverOffsetOptions \| boolean` | `undefined`  | Distance or axis offsets passed to `useFloating`.                              |
| `flip`      | `boolean \| GhostPopoverFlipOptions`   | `true`       | Flip to an opposite placement when overflowing.                                |
| `shift`     | `boolean \| GhostPopoverShiftOptions`  | `true`       | Shift along the cross axis to stay inside the boundary.                        |
| `strategy`  | `'absolute' \| 'fixed'`                | `'absolute'` | CSS positioning strategy passed to `useFloating`.                              |
| `portal`    | `boolean`                              | `true`       | Teleport content via `GhostPortal` when `true`, or render inline when `false`. |
| `portalTo`  | `GhostPortalTarget`                    | `'body'`     | Teleport destination passed to `GhostPortal`.                                  |

Keeps `visibility: hidden` until `useFloating().isPositioned` resolves so
first-paint layout never flashes at `(0, 0)`. Sets `role="dialog"`,
`tabindex="-1"`, `data-part="content"`, `data-state="open"`, `data-placement`,
and `aria-labelledby` (pointing to the trigger unless `aria-label` or
`aria-labelledby` is provided). Exposes `{ element, focus, blur }`.

### `GhostPopoverClose`

| Prop       | Type                  | Default    | Description                                        |
| ---------- | --------------------- | ---------- | -------------------------------------------------- |
| `as`       | `string \| Component` | `'button'` | Element tag or component for the close button.     |
| `disabled` | `boolean`             | `false`    | Prevents closing on click and keyboard activation. |

Closes the enclosing `GhostPopover` on click or keyboard activation and
exposes `{ element, focus, blur }`.

## Accessibility

- **Non-modal semantics:** `GhostPopoverContent` sets `role="dialog"` without
  `aria-modal="true"`, allowing `Tab` to move normally through and out of the
  popover (`useFocusScope` with `trapped: false`).
- **Focus entry & return:** Opening moves focus to the first `[data-autofocus]`
  or tabbable descendant inside `GhostPopoverContent` (or to the dialog
  container itself when none exist). Closing via `Escape`, `GhostPopoverClose`,
  or the trigger returns focus to the trigger.
- **Layer dismissal:** `useDismissableLayer` closes only the topmost open
  popover on `Escape` or outside `pointerdown`, ignoring the trigger so clicking
  an open trigger toggles cleanly instead of close-then-reopen.

## Specification

See [GhostPopover specification](./popover-spec.md) and
[ADR 0011](../adr/0011-overlay-primitives.md).
