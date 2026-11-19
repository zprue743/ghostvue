# GhostTree

`GhostTree` is a hierarchical list (`role="tree"`) for file explorers, taxonomy
filters, and nested outlines. It follows the
[WAI-ARIA APG Tree View pattern](https://www.w3.org/WAI/ARIA/apg/patterns/treeview/).
You render your own nested data with keyed `GhostTreeItem` parts; the tree
tracks only their `value` strings and never reads or mutates your objects.
Import `GhostTree`, `GhostTreeItem`, `GhostTreeTrigger`, and `GhostTreeGroup`
from `@ghostvue/vue` for headless use, or from `@ghostvue/themes` for the
default row, indentation, and motion styles.

## Basic use

<GhostExample id="tree/basic" />

- `GhostTreeItem` is the `role="treeitem"` node (`<li>` by default) and the
  focus target. Give it a unique, stable `value`.
- `GhostTreeTrigger` is the row label (`<span>`, no role, no `tabindex`). The
  item uses it as its accessible name, so child items are never read as part of
  the parent's name.
- `GhostTreeGroup` holds child items (`<ul role="group">`). An item with a group
  is a branch and gets `aria-expanded` and `aria-controls`; an item without one
  is a leaf.

The tree has one Tab stop. Arrow keys move focus over visible, enabled items in
rendered order; focus never changes selection or expansion on its own.

## Selection and expansion

<GhostExample id="tree/multi-select" />

- `v-model` holds the selection: `string | undefined` with the default
  `selection-mode="single"`, or `string[]` with `selection-mode="multiple"`
  (which also sets `aria-multiselectable="true"`). Omit it and use
  `default-value` for uncontrolled state.
- `v-model:expanded` holds the open branch values (`string[]`); use
  `default-expanded` for uncontrolled state.
- `Enter` and `Space` select the focused item in single mode and toggle it in
  multiple mode, with no modifier keys. In single mode, set `allow-deselect` to
  let reactivation clear the selection.
- Updates always emit new arrays. If a controlled parent ignores an update, the
  DOM and ARIA state keep showing the parent's value, and `ArrowRight` never
  enters a branch that did not actually open.
- Selection is independent per node: selecting a parent never selects its
  children and selecting every child never selects the parent. Range selection
  (`Shift+Arrow`) and `Ctrl/Cmd+A` are intentionally not provided.
- `select` and `toggle` events report each requested change as
  `{ value, selected }` and `{ value, expanded }`, for example to load children
  when a branch opens.

## Pointer behavior and split triggers

<GhostExample id="tree/split-trigger" />

Clicking a row selects it and, while `expand-on-click` is `true` (the default),
also toggles a branch. `GhostTreeTrigger` takes an `action`:

- `'both'` (default) selects and toggles like a row click.
- `'toggle'` only expands or collapses. Use it for a chevron; it never names the
  item.
- `'select'` only selects.

Clicks that bubble from a nested item never select or toggle its parent.

## Right-to-left

<GhostExample id="tree/rtl" />

Pass `dir`, or let the tree inherit it from the closest `[dir]` ancestor or
`<html dir>`. In RTL, `ArrowLeft` opens a branch or enters its first child and
`ArrowRight` closes a branch or moves to the parent. The root reports the result
in `data-dir`.

## Themed use

<GhostExample id="tree/themed" />

`@ghostvue/themes` loads `ghost-tree.css`. Rows indent by
`--ghost-tree-level` (set on every item) with logical padding, so any depth
works in both directions. Selected rows use `--ghost-surface-muted-bg`, hovered
rows `--ghost-elevation-2-bg`, and the focus ring is drawn on the focused row
only, never around an open child group. Groups animate their height when motion
is allowed; set `disable-animation` on a group to turn that off.

## Keyboard

| Key                     | Behavior                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------- |
| `Tab` / `Shift+Tab`     | Moves into and out of the tree (one Tab stop).                                                       |
| `ArrowDown` / `ArrowUp` | Next / previous visible enabled item. Wraps only with `loop`.                                        |
| `ArrowRight` (LTR)      | Opens a closed branch; on an open branch, moves to its first child. Leaves: nothing.                 |
| `ArrowLeft` (LTR)       | Closes an open branch; otherwise moves to the closest enabled ancestor.                              |
| `Home` / `End`          | First / last visible enabled item.                                                                   |
| `Enter`                 | Selects (single) or toggles selection (multiple). Never toggles expansion.                           |
| `Space`                 | Same as `Enter`, unless a typeahead query is active, in which case it is part of the query.          |
| `*`                     | Opens every closed, enabled sibling branch of the focused item.                                      |
| Printable characters    | Typeahead (500 ms) over visible items, using `text-value`, the trigger text, or the item's own text. |
| `Alt` / `Ctrl` / `Meta` | Chords are left to the browser and assistive technology.                                             |
| IME composition         | Ignored until the input method commits text.                                                         |

In RTL the two horizontal arrows swap.

## Focus recovery

- When a branch closes while one of its descendants has focus, focus moves to
  the closest visible enabled ancestor.
- When the focused item unmounts, focus moves to the next visible enabled item,
  then the previous one, then the closest ancestor. No `update:*` event is
  emitted: removing an item never changes the selection or expansion values.
- Keyed reordering and insertion keep the current Tab stop; navigation always
  follows the rendered order.

## Disabled items

`disabled` on `GhostTree` disables everything. `disabled` on a `GhostTreeItem`
removes that item from selection, expansion, navigation, and typeahead, but not
its children: if a disabled branch is open, its enabled children stay reachable,
and `ArrowLeft` from them skips to the closest enabled ancestor.

## Server rendering

IDs, `aria-expanded`, `aria-controls`, `aria-labelledby`, closed groups
(`hidden`), and the initial `tabindex="0"` are rendered on the server and
hydrate without mismatches. To get branch ARIA in server HTML, put
`GhostTreeGroup` and `GhostTreeTrigger` directly in the item's slot (inside
plain elements is fine); parts nested inside your own wrapper components are
recognized after hydration.

## API

See the [generated component references](/reference/) for props, emits, slots,
exposed members, and styling hooks.

### `GhostTree`

Props: `as` (default `'ul'`), `selectionMode`, `modelValue`, `defaultValue`,
`expanded`, `defaultExpanded`, `allowDeselect`, `expandOnClick` (default
`true`), `loop`, `dir`, and `disabled`. Emits `update:modelValue`,
`update:expanded`, `select`, and `toggle`. The default slot receives
`{ modelValue, expanded, focusedValue, isSelected, isExpanded, select, toggleExpanded, expandAllSiblings }`.
Sets `data-part="root"`, `data-ghost-tree`, `data-dir`, and `data-disabled`.

### `GhostTreeItem`

Props: `as` (default `'li'`), `value` (required), `disabled`, and `textValue`.
The default slot receives
`{ selected, expanded, focused, disabled, expandable, level, select, toggle }`.
Sets `data-part="item"`, `data-state="checked" | "disabled"`, `data-selected`,
`data-expanded` (branches), `data-disabled`, `data-level`, and the inline
`--ghost-tree-level` custom property.

### `GhostTreeTrigger`

Props: `as` (default `'span'`), `action`, and `disabled`. Sets
`data-part="trigger"`, `data-state="open" | "closed"` (branches) or `"checked"`
(selected leaves), `data-selected`, and `data-disabled`. `focus()` focuses the
owning item.

### `GhostTreeGroup`

Props: `as` (default `'ul'`) and `disableAnimation`. Sets `role="group"`,
`data-part="group"`, `data-state="open" | "closed"`, `hidden` while closed, and
`data-animation="off"`.

Every part exposes `{ element, focus, blur }`.

### `useGhostTree(options?)` and `resolveTreeDir(dir?, element?)`

`useGhostTree` is the state engine behind `GhostTree`: selection, expansion,
the item registry, the roving tab stop, keyboard handling, and typeahead.
`resolveTreeDir` returns `'ltr' | 'rtl'` from an explicit value, the closest
`[dir]` ancestor, then `<html dir>`, and is safe to call during SSR.

## Accessibility

- Name the tree with `aria-label` or `aria-labelledby` on `GhostTree`.
- Mark decorative icons and chevrons `aria-hidden="true"`; they are then left
  out of both the accessible name and typeahead.
- Do not put buttons, links, or other focusable controls inside an item. The
  item is the only focus target.
- In forced-colors mode, selected rows use `Highlight` / `HighlightText` and
  disabled rows `GrayText`.

## Specification

See [GhostTree specification](/specs/tree) and
[GhostCollapsible](./collapsible.md).
