# GhostPagination

`GhostPagination` navigates a bounded page sequence for tables and lists. Import
it from `@ghostvue/vue` for headless semantics, or from `@ghostvue/themes` for
the default control styling. Fetching, totals, and URL sync stay outside the
component.

## Basic use

<GhostExample id="pagination/basic" />

The root is a `<nav>` landmark. Numbered controls expose `aria-current="page"`
on the active page. Edge controls use visible glyphs with configurable accessible
names (`firstLabel`, `previousLabel`, `nextLabel`, `lastLabel`).

## Controlled state

<GhostExample id="pagination/controlled" />

`v-model` binds a **1-based** page index. When `modelValue` is omitted, the
component is uncontrolled and starts at `defaultPage` (default `1`).

## Ellipsis

<GhostExample id="pagination/ellipsis" />

`getPaginationRange` (exported from `@ghostvue/vue`) builds the numbered range
and ellipsis markers from `siblingCount` and `boundaryCount` (both default `1`).

## Themed use

<GhostExample id="pagination/themed" />

| Prop   | Type                   | Default | Description     |
| ------ | ---------------------- | ------- | --------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'`  | Control sizing. |

Themed instances wrap the headless root in `.ghost-themed-scope` and style list
layout, page buttons, and ellipsis affordances.

## API

| Prop            | Type      | Default        | Description                        |
| --------------- | --------- | -------------- | ---------------------------------- |
| `modelValue`    | `number`  | omitted        | Controlled current page (1-based). |
| `defaultPage`   | `number`  | `1`            | Initial page when uncontrolled.    |
| `pageCount`     | `number`  | required       | Total pages (`≥ 1`).               |
| `siblingCount`  | `number`  | `1`            | Pages beside the current page.     |
| `boundaryCount` | `number`  | `1`            | Pages pinned at each end.          |
| `showEdges`     | `boolean` | `true`         | Render first and last controls.    |
| `disabled`      | `boolean` | `false`        | Disable every control.             |
| `ariaLabel`     | `string`  | `'Pagination'` | `aria-label` on the `nav` root.    |

Native attributes fall through to the `nav`. Template refs expose `element`,
`focus()`, and `blur()`. Optional slots: `page` and `ellipsis`.

## Keyboard and focus

Arrow keys move focus among controls (`useRovingFocus`, horizontal, no loop).
`Enter` / `Space` activate the focused button. The current page button is
disabled but remains in the roving set.

## See also

- [`GhostButton`](./button.md) — shared action semantics for custom layouts.
- [Specification](./pagination-spec.md)
