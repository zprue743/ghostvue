# GhostPagination

`GhostPagination` navigates a bounded page sequence for tables and lists. Import
it from `@ghostvue/vue` for headless semantics, or from `@ghostvue/themes` for
the default control styling. Fetching, totals, and URL sync stay outside the
component.

<GhostExample id="pagination/themed" />

Themed instances wrap the headless root in `.ghost-themed-scope` and style list
layout, page buttons, and ellipsis affordances.

<!-- @generated docs-api:themes/ghost-pagination begin -->

<!-- Source: packages/themes/manifests/ghost-pagination.manifest.json. Run pnpm docs:api:write after it changes. -->

`@ghostvue/themes` adds these to the headless `GhostPagination` API, which it forwards:

| Prop   | Type                   | Default | Description                              |
| ------ | ---------------------- | ------- | ---------------------------------------- |
| `size` | `'sm' \| 'md' \| 'lg'` | `"md"`  | Control sizing. Default omits data-size. |

<!-- @generated docs-api:themes/ghost-pagination end -->

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

## API

<!-- @generated docs-api:vue/ghost-pagination begin -->

<!-- Source: packages/vue/manifests/ghost-pagination.manifest.json. Run pnpm docs:api:write after it changes. -->

| Prop            | Type                         | Default           | Description                        |
| --------------- | ---------------------------- | ----------------- | ---------------------------------- |
| `ariaLabel`     | `string`                     | `"Pagination"`    | `aria-label` on the `nav` root.    |
| `boundaryCount` | `number`                     | `1`               | Pages pinned at each end.          |
| `defaultPage`   | `number`                     | `1`               | Initial page when uncontrolled.    |
| `disabled`      | `boolean`                    | `false`           | Disable every control.             |
| `ellipsisLabel` | `string`                     | `"More pages"`    | Declared prop `ellipsisLabel`.     |
| `firstLabel`    | `string`                     | `"First page"`    | Declared prop `firstLabel`.        |
| `getPageLabel`  | `((page: number) => string)` | —                 | Declared prop `getPageLabel`.      |
| `lastLabel`     | `string`                     | `"Last page"`     | Declared prop `lastLabel`.         |
| `modelValue`    | `number`                     | —                 | Controlled current page (1-based). |
| `nextLabel`     | `string`                     | `"Next page"`     | Declared prop `nextLabel`.         |
| `pageCount`     | `number`                     | Required          | Total pages (`≥ 1`).               |
| `previousLabel` | `string`                     | `"Previous page"` | Declared prop `previousLabel`.     |
| `showEdges`     | `boolean`                    | `true`            | Render first and last controls.    |
| `siblingCount`  | `number`                     | `1`               | Pages beside the current page.     |

| Slot       | Slot props                         | Description            |
| ---------- | ---------------------------------- | ---------------------- |
| `ellipsis` | `placement: 'end' \| 'start'`      | Named slot `ellipsis`. |
| `page`     | `current: boolean`, `page: number` | Named slot `page`.     |

<!-- @generated docs-api:vue/ghost-pagination end -->

Native attributes fall through to the `nav`. Template refs expose `element`,
`focus()`, and `blur()`. Optional slots: `page` and `ellipsis`.

## Keyboard and focus

Each control stays in the native tab order (no roving tabindex). `Enter` /
`Space` activate the focused button. Inactive edge controls use
`aria-disabled="true"` so focus is not lost when a control becomes inactive.
The current page is marked with `aria-current="page"` only. Native `disabled` is
reserved for the whole component.

## See also

- [`GhostButton`](./button.md) — shared action semantics for custom layouts.
- [Specification](/specs/pagination)
