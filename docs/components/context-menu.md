# GhostContextMenu

`GhostContextMenu` implements the WAI-ARIA APG **context menu** pattern for
[GHO-92](https://linear.app/ghost-vue/issue/GHO-92): right-click, long-press, and
`Shift+F10` / `ContextMenu` keyboard shortcuts open a portaled `role="menu"` at the
pointer via a virtual `useFloating` anchor.

Import parts from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the
default elevated menu surface (same item tokens as `GhostDropdownMenu`).

<GhostExample id="context-menu/themed" />

Right-click any file row or focus it and press `Shift+F10` (or the `ContextMenu`
key) to open the menu. The themed `GhostContextMenuContent` sets `data-themed` so
portaled panels receive elevation-3 tokens outside a `.ghost-theme` host, and
each action announces its outcome in the `role="status"` footer.

## Basic use

<GhostExample id="context-menu/basic" />

Right-click or focus the target and press `Shift+F10` to open. Item keyboard behavior
comes from `useGhostMenuCollection` (shared with `GhostDropdownMenu`). The native
`contextmenu` event is suppressed only when this menu actually opens.

## API

See the [generated component references](/reference/) for props, emits, slots, and
styling hooks.

## Specification

See [GhostContextMenu specification](/specs/context-menu) and
[ADR 0011](../adr/0011-overlay-primitives.md).

### Follow-ups

Nested submenus are out of scope ([GHO-107](https://linear.app/ghost-vue/issue/GHO-107)).
