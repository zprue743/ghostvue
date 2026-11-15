# GhostMenubar

`GhostMenubar` implements the WAI-ARIA APG **Menubar** pattern
([GHO-107](https://linear.app/ghost-vue/issue/GHO-107)): a horizontal
`role="menubar"` with one tab stop, roving focus among top-level `menuitem`
triggers, and dropdown-style flat menus per `GhostMenubarMenu`.

Import parts from `@ghostvue/vue` for headless use, or from `@ghostvue/themes`
for default elevation and item styling.

## Basic use

<GhostExample id="menubar/basic" />

`GhostMenubar` registers each `GhostMenubarMenu`, enforces at most one open menu,
and delegates horizontal trigger navigation to `useRovingFocus`. Each menu reuses
`useGhostMenubarMenu` (overlay stack + `useGhostMenuCollection` for item
keyboard behavior).

## Themed use

<GhostExample id="menubar/themed" />

Themed content sets `data-themed` on portaled panels so
`.ghost-menubar-content` picks up elevation-3 tokens and item hover/focus styles.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, and executable examples.

### Composition

- `GhostMenubar` — `role="menubar"` container; optional `dir` for RTL arrow flip.
- `GhostMenubarMenu` — renderless open state (`v-model:open`).
- `GhostMenubarTrigger` — `role="menuitem"` with `aria-haspopup="menu"`.
- `GhostMenubarContent` — floating `role="menu"` (default `placement="bottom-start"`).
- Item, group, label, separator, checkbox, and radio parts match
  `GhostDropdownMenu` semantics inside each menu.

Nested submenus inside a menu are not supported yet (see
[specification](/specs/menubar)).

See [GhostMenubar specification](/specs/menubar) for the full accessibility
contract and keyboard table.
