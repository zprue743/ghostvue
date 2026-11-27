# GhostPopover

`GhostPopover` is the non-modal floating disclosure for [GHO-78](https://linear.app/ghost-vue/issue/GHO-78)
(disclosure dialog semantics, not menu, tooltip, or modal dialog).

`GhostPopover` renders a floating, non-modal disclosure dialog anchored to a
trigger control. Import `GhostPopover`, `GhostPopoverTrigger`,
`GhostPopoverContent`, and `GhostPopoverClose` from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for the default elevated surface.

<GhostExample id="popover/share-settings" />

**Share** opens the sharing settings for the plan next to its trigger. The panel
takes its accessible name from its own heading through `aria-labelledby`, and
focus enters on the checked **General access** option. Every setting applies
right away. The summary on the card is a polite `role="status"` region, so each
change is announced as its outcome: who can open the plan and what they can do.
**Link permission** is disabled while access is **Restricted**, since only
invited people can open the plan. **Done** and `Escape` close the panel and
return focus to **Share**. This example renders the panel inline after the
trigger. `Tab` from **Done** continues to the next control in the page, and
`Shift+Tab` from the first option returns to **Share**. A click outside the
panel closes it and leaves focus on the clicked control when it can take focus.
The panel opens `bottom-end`,
flips above the trigger near the bottom of the viewport, and shifts to stay
inside narrow screens, keeping an 8px gap from the viewport edges through the
`flip` and `shift` padding options. Its width is the smaller of 20rem and the
viewport minus 4rem. The themed surface follows the page's light and dark
appearance.

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

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

<!-- @generated docs-api:vue/ghost-popover begin -->

<!-- Source: packages/vue/manifests/ghost-popover.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop          | Type      | Default | Description                                        |
| ------------- | --------- | ------- | -------------------------------------------------- |
| `defaultOpen` | `boolean` | `false` | Initial open state when `open` is omitted.         |
| `open`        | `boolean` | —       | Controlled open state. Omit for uncontrolled mode. |

| Slot      | Slot props                           | Description                                                                 |
| --------- | ------------------------------------ | --------------------------------------------------------------------------- |
| `default` | `close: () => void`, `open: boolean` | Trigger and content parts plus optional custom UI reading the scoped state. |

<!-- @generated docs-api:vue/ghost-popover end -->

<!-- @generated docs-api:themes/ghost-popover begin -->

<!-- Source: packages/themes/manifests/ghost-popover.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostPopover` API, which it forwards.

<!-- @generated docs-api:themes/ghost-popover end -->

### `GhostPopover` (root)

Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean, close: () => void }`.

### `GhostPopoverTrigger`

Sets `type="button"` (when `as="button"`), `aria-haspopup="dialog"`,
`aria-expanded`, `aria-controls`, `data-part="trigger"`, and
`data-state="open" | "closed"`. Exposes `{ element, focus, blur }`.

### `GhostPopoverContent`

Keeps `visibility: hidden` until `useFloating().isPositioned` resolves so
first-paint layout never flashes at `(0, 0)`. Sets `role="dialog"`,
`tabindex="-1"`, `data-part="content"`, `data-state="open"`, `data-placement`,
and `aria-labelledby` (pointing to the trigger unless `aria-label` or
`aria-labelledby` is provided). Exposes `{ element, focus, blur }`.

### `GhostPopoverClose`

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

See [GhostPopover specification](/specs/popover) and
[ADR 0011](../adr/0011-overlay-primitives.md).
