# GhostDropdownMenu

`GhostDropdownMenu` is the floating actions menu for
[GHO-80](https://linear.app/ghost-vue/issue/GHO-80) (WAI-ARIA APG **Menu Button**
semantics, not dialog, tooltip, or native `<select>`).

Import the parts from `@ghostvue/vue` for headless use, or from `@ghostvue/themes`
for the default elevated menu surface and interactive item styling.

<GhostExample id="dropdown-menu/record-actions" />

Each brief has an icon-only **Actions** trigger whose accessible name includes
the brief title. The menu groups **Edit title** and **Duplicate**, then the
status action, and sets **Archive** apart after a separator in the danger text
color. Every action changes the list and is announced in the `role="status"`
line. Focus follows the outcome: **Edit title** moves focus to the title field,
**Save**, **Cancel**, and `Escape` return it to the row's trigger, and
**Archive** moves it to the next row's trigger (or **Undo archive** when the
list is empty) because the trigger that opened the menu has gone. The panel
opens at `bottom-end` under the trigger; `flip` and `shift` keep it inside the
viewport when a row sits near the bottom or the inline edge. Below about 22rem
the status badge moves under the title so the trigger stays on the row.

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

The inbox **View** menu labels its checkbox group and radio group with
`GhostDropdownMenuLabel` through `aria-labelledby`. Checkbox items toggle
without closing; choosing a sort order or **Reset view** closes the menu. The
theme does not draw a check mark, so the example renders its own `aria-hidden`
indicator in a fixed-width slot; `aria-checked` carries the state for
assistive technology.

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

- `GhostDropdownMenuItem` — `role="menuitem"`; emits `select` with the activating
  event. The menu closes unless the handler calls `event.preventDefault()`.
- `GhostDropdownMenuCheckboxItem` — `role="menuitemcheckbox"` with
  `v-model:checked`; toggles without closing.
- `GhostDropdownMenuRadioGroup` / `GhostDropdownMenuRadioItem` —
  `menuitemradio` collection with `v-model`; selecting a radio emits
  `(value, event)` and closes unless `event.preventDefault()`.
- `GhostDropdownMenuLabel`, `GhostDropdownMenuSeparator`, `GhostDropdownMenuGroup`
  — structural parts with `data-part` hooks only (no roving focus).

## Accessibility

- **Menu semantics:** Trigger advertises `aria-haspopup="menu"`; content uses
  `role="menu"` with roving `tabindex="-1"` items (not a dialog or listbox).
- **Keyboard:** Arrow keys move among enabled items; `Home` / `End` jump;
  typeahead focuses the next match; `Enter` / `Space` activate; checkbox items
  toggle on `Space` without dismissing; `Escape` closes and returns focus to the
  trigger. Keys owned by an active IME composition are left to the input method.
- **Dismissal:** Outside pointer and `Escape` use `useDismissableLayer` with the
  trigger ignored so trigger clicks toggle cleanly.

## Specification

See [GhostDropdownMenu specification](/specs/dropdown-menu) and
[ADR 0011](../adr/0011-overlay-primitives.md).
