# GhostTable

`GhostTable` primitives compose native `<table>` markup for static data. Import
parts from `@ghostvue/vue` for headless use, or `GhostTable` from
`@ghostvue/themes` for default cell and header styling.

## Basic use

Always place rows inside `GhostTableHead`, `GhostTableBody`, or
`GhostTableFoot`. Explicit `<tbody>` avoids browser-inserted section mismatches
during SSR hydration.

<GhostExample id="table/basic" />

## API

### `GhostTable`

| Prop                | Type      | Default | Description                                                              |
| ------------------- | --------- | ------- | ------------------------------------------------------------------------ |
| `containHorizontal` | `boolean` | `false` | Wraps the table in `data-part="scroll-container"` for horizontal scroll. |

Native attributes fall through to the `<table>` element. Exposes `element`:
`HTMLTableElement | null`.

### Parts

| Component              | Element   | Props                                                |
| ---------------------- | --------- | ---------------------------------------------------- |
| `GhostTableCaption`    | `caption` | fallthrough                                          |
| `GhostTableHead`       | `thead`   | fallthrough                                          |
| `GhostTableBody`       | `tbody`   | fallthrough                                          |
| `GhostTableFoot`       | `tfoot`   | fallthrough                                          |
| `GhostTableRow`        | `tr`      | fallthrough                                          |
| `GhostTableHeaderCell` | `th`      | `scope?: 'col' \| 'row' \| 'colgroup' \| 'rowgroup'` |
| `GhostTableCell`       | `td`      | fallthrough                                          |

Each part exposes `element` for its native host.

## Row headers

<GhostExample id="table/row-headers" />

## Horizontal containment

Wide tables opt in to a scroll container. Overflow is never implied on the
`<table>` itself.

<GhostExample id="table/contain-horizontal" />

## Composable use

<GhostExample id="table/composable" />

## Themed use

<GhostExample id="table/themed" />

The themed root wraps `.ghost-themed-scope` and loads the default recipe. Parts
remain unstyled imports from `@ghostvue/vue`.

## Styling

Hooks follow existing `data-part` conventions:

- `ghost-table` / `data-part="root"` / `data-ghost-table` on the table
- `ghost-table-scroll-container` / `data-part="scroll-container"` when containment is enabled
- Section and cell classes: `ghost-table-head`, `ghost-table-body`, `ghost-table-row`, etc.

## Accessibility

Use `GhostTableCaption` when the table needs a name. Set `scope` on
`GhostTableHeaderCell` when header relationships are not implicit. Sorting,
filtering, and selection are out of scope; compose controls inside cells when
needed.

Specification: [GhostTable specification](./table-spec.md).
