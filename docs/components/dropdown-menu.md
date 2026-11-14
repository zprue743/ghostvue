# GhostDropdownMenu

`GhostDropdownMenu` is the floating actions menu for
[GHO-80](https://linear.app/ghost-vue/issue/GHO-80) (WAI-ARIA APG **Menu Button**
semantics, not dialog, tooltip, or native `<select>`).

Import the parts from `@ghostvue/vue` for headless use, or from `@ghostvue/themes`
for the default elevated menu surface and interactive item styling.

## Basic use

<GhostExample id="dropdown-menu/basic" />

`GhostDropdownMenu` owns `open` via `useControllableState`, assigns deterministic
IDs via `useGhostId`, positions the panel with `useFloating`, renders through
`GhostPortal` by default, unmounts content with `v-if` when closed, closes on
`Escape` and outside `pointerdown` through `useDismissableLayer`, restores focus
to the trigger on close via `useFocusScope`, and delegates item roving,
typeahead, and activation keys to `useGhostMenuCollection`.

## Themed use

<GhostExample id="dropdown-menu/themed" />

Importing from `@ghostvue/themes` loads `default.css`, styling
`.ghost-dropdown-menu-content` with elevation-3 surface tokens and
`[data-part="item"]`, checkbox, radio, label, and separator hooks inside the
panel. The themed `GhostDropdownMenuContent` sets `data-themed` so portaled
menus pick up tokens outside a `.ghost-theme` host.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, CSS variables, and executable examples.

### `GhostDropdownMenu` (root)

Emits `update:open` with `(open: boolean)`. The default slot receives
`{ open: boolean, close: () => void }`.

### `GhostDropdownMenuTrigger`

Sets `type="button"` (when `as="button"`), `aria-haspopup="menu"`,
`aria-expanded`, `aria-controls`, `data-part="trigger"`, and
`data-state="open" | "closed"`. `ArrowDown` / `ArrowUp` opens the menu and
focuses the first or last item. Exposes `{ element, focus, blur }`.

### `GhostDropdownMenuContent`

Keeps `visibility: hidden` until `useFloating().isPositioned` resolves. Sets
`role="menu"`, `tabindex="-1"`, `data-part="content"`, and `data-state`. Exposes
`{ element, focus, blur }`.

### Items and groups

- `GhostDropdownMenuItem` — `role="menuitem"`; emits `select` and closes the menu.
- `GhostDropdownMenuCheckboxItem` — `role="menuitemcheckbox"` with
  `v-model:checked`; toggles without closing.
- `GhostDropdownMenuRadioGroup` / `GhostDropdownMenuRadioItem` —
  `menuitemradio` collection with `v-model`; selecting a radio closes the menu.
- `GhostDropdownMenuLabel`, `GhostDropdownMenuSeparator`, `GhostDropdownMenuGroup`
  — structural parts with `data-part` hooks only (no roving focus).

## Accessibility

- **Menu semantics:** Trigger advertises `aria-haspopup="menu"`; content uses
  `role="menu"` with roving `tabindex="-1"` items (not a dialog or listbox).
- **Keyboard:** Arrow keys move among enabled items; `Home` / `End` jump;
  typeahead focuses the next match; `Enter` / `Space` activate; checkbox items
  toggle on `Space` without dismissing; `Escape` closes and returns focus to the
  trigger.
- **Dismissal:** Outside pointer and `Escape` use `useDismissableLayer` with the
  trigger ignored so trigger clicks toggle cleanly.

## Specification

See [GhostDropdownMenu specification](./dropdown-menu-spec.md) and
[ADR 0011](../adr/0011-overlay-primitives.md).