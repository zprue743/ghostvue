# GhostDrawer

`GhostDrawer` (also called a Sheet) is an edge-anchored panel built as a
`GhostDialog` variant. It anchors to the `start`, `end`, `top`, or `bottom`
viewport edge and keeps the dialog's focus trapping, dismissal, scroll locking,
and background isolation. Use it for DataTable filter panels, row-detail
inspectors, and navigation drawers. Import `GhostDrawer`, `GhostDrawerTrigger`,
`GhostDrawerOverlay`, `GhostDrawerContent`, `GhostDrawerTitle`,
`GhostDrawerDescription`, and `GhostDrawerClose` from `@ghostvue/vue` for
headless use, or from `@ghostvue/themes` for the default edge panel, scrim, and
slide-in entry.

<GhostExample id="drawer/themed" />

**Inspect order** opens an `end`-anchored modal drawer with order details and
actions. Importing from `@ghostvue/themes` loads `default.css`, which styles
`.ghost-drawer-overlay` with `var(--ghost-scrim)` and `.ghost-drawer-content`
with `--ghost-elevation-4-*`, radius, hairline border, inset padding, and
focus-ring tokens. Panels slide and fade in with `@starting-style`.

## Basic use

<GhostExample id="drawer/basic" />

`GhostDrawer` defaults to `side="end"` and `modal`. It shares its behavior with
`GhostDialog`: controllable `open`, deterministic IDs, `GhostPortal` teleport,
`v-if` unmounting, scroll lock, `inert` background siblings (skipping
`[data-ghost-live]`), `Escape` and outside `pointerdown` dismissal, and a looped
`Tab` trap.

## Sides and writing direction

<GhostExample id="drawer/sides" />

`start` and `end` are logical. A drawer portaled to `<body>` cannot inherit the
direction of the subtree around its trigger, so `GhostDrawerContent` resolves it
(explicit `dir` → content ancestor → trigger ancestor → `<html dir>` → `ltr`),
exposes `data-dir="ltr" | "rtl"`, and sets `dir="rtl"` on the panel when needed.
The theme maps `data-side` + `data-dir` to physical `left` / `right` edges.
`top` and `bottom` open as full-width sheets. Set `side` on `GhostDrawer`, or
override it on `GhostDrawerContent`. Every part reports the effective side in
`data-side`.

## Non-modal drawers

<GhostExample id="drawer/non-modal" />

`:modal="false"` removes `GhostDrawerOverlay`, `aria-modal`, scroll lock,
background `inert`, and the `Tab` trap, so the page stays usable. A non-modal
drawer open at mount does not steal focus. Clicking another focusable control
outside closes the drawer and leaves focus on that control.

## Nested overlays

<GhostExample id="drawer/nested" />

Dialogs, popovers, selects, and menus opened inside a drawer stack above it.
`Escape` dismisses only the topmost layer. `GhostDrawer` uses its own injection
key, so `GhostDialog` parts inside a drawer always bind to their own dialog.

## Motion

With `prefers-reduced-motion: no-preference`, panels slide in from their edge
and fade in using `--ghost-motion-enter-duration` and
`--ghost-motion-enter-easing`. With `prefers-reduced-motion: reduce`, the theme
sets `translate: none` and keeps only a short opacity fade. There is no exit
animation: closing unmounts the panel immediately.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

### `GhostDrawer` (root)

Props: `open`, `defaultOpen`, `modal` (default `true`), `side` (default
`'end'`), and `dir`. Emits `update:open`. The default slot receives
`{ open, close, side }`.

### `GhostDrawerTrigger`

Sets `type="button"` (for `as="button"`), `aria-haspopup="dialog"`,
`aria-expanded`, `aria-controls`, `data-part="trigger"`, `data-state`, and
`data-side`.

### `GhostDrawerOverlay`

Renders only while open and modal. Sets `aria-hidden="true"`,
`data-part="overlay"`, `data-state="open"`, and `data-side`.

### `GhostDrawerContent`

Props: `as`, `side`, `dir`, `role`, `closeOnEscape`, `closeOnOutsideClick`,
`portal`, and `portalTo`. Sets `role`, `aria-modal="true"` (when modal),
`tabindex="-1"`, `data-part="content"`, `data-state="open"`, `data-side`,
`data-dir`, `aria-labelledby`, and `aria-describedby`.

### `GhostDrawerTitle`, `GhostDrawerDescription`, `GhostDrawerClose`

Title and Description register their IDs for `aria-labelledby` and
`aria-describedby`. Close closes the drawer on click, `Enter`, or `Space`.
Every part exposes `{ element, focus, blur }`.

### `useGhostDrawer(options?)` and `resolveDrawerDir(options?)`

`useGhostDrawer` returns `{ isOpen, isModal, side, dir, open, close, toggle, triggerId, contentId, titleId, descriptionId }`.
`resolveDrawerDir({ dir, contentElement, triggerElement, documentElement })`
returns `'ltr' | 'rtl'` and is safe to call during SSR.

## Accessibility

- Always render `GhostDrawerTitle` (or pass `aria-label` / `aria-labelledby` on
  `GhostDrawerContent`); otherwise [GHOST002](../warnings.md#ghost002) is logged
  in development. `role="alertdialog"` also needs a description
  ([GHOST003](../warnings.md#ghost003)).
- Modal drawers trap focus, mark the background `inert`, and restore focus to
  the trigger after closing.
- Placement and direction are visual only; the drawer is announced as a dialog.
- In forced-colors mode the panel uses system `Canvas` / `CanvasText` colors and
  a `Highlight` focus outline.

## Specification

See [GhostDrawer specification](/specs/drawer),
[GhostDialog](./dialog.md), and
[ADR 0012: Modal overlays](../adr/0012-modal-overlays.md).
