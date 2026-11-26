# GhostMenubar

`GhostMenubar` implements the WAI-ARIA APG **Menubar** pattern
([GHO-107](https://linear.app/ghost-vue/issue/GHO-107)): a horizontal
`role="menubar"` with one tab stop, roving focus among top-level `menuitem`
triggers, and dropdown-style flat menus per `GhostMenubarMenu`.

Import parts from `@ghostvue/vue` for headless use, or from `@ghostvue/themes`
for default elevation and item styling.

<GhostExample id="menubar/themed" />

The editor toolbar composes `GhostMenubarTrigger` with `:as="GhostButton"` and
keeps a single `Tab` stop across **File**, **Edit**, and **View**. Themed
content sets `data-themed` on portaled panels so `.ghost-menubar-content` picks
up elevation-3 tokens and item hover/focus styles in light and dark mode.

## Basic use

<GhostExample id="menubar/basic" />

`GhostMenubar` registers each `GhostMenubarMenu`, enforces at most one open menu,
and delegates horizontal trigger navigation to `useRovingFocus`. Each menu reuses
`useGhostMenubarMenu` (overlay stack + `useGhostMenuCollection` for item
keyboard behavior).

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, styling hooks, and executable examples.

<!-- @generated docs-api:vue/ghost-menubar begin -->

<!-- Source: packages/vue/manifests/ghost-menubar.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop  | Type                  | Default | Description          |
| ----- | --------------------- | ------- | -------------------- |
| `as`  | `Component \| string` | `"div"` | Declared prop `as`.  |
| `dir` | `'ltr' \| 'rtl'`      | —       | Declared prop `dir`. |

| Slot      | Slot props | Description        |
| --------- | ---------- | ------------------ |
| `default` | —          | Container content. |

<!-- @generated docs-api:vue/ghost-menubar end -->

<!-- @generated docs-api:themes/ghost-menubar begin -->

<!-- Source: packages/themes/manifests/ghost-menubar.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds no props, events, or slots to the headless `GhostMenubar` API, which it forwards.

<!-- @generated docs-api:themes/ghost-menubar end -->

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
