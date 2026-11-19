# GhostTable

`GhostTable` primitives compose native `<table>` markup for static data. Import
parts from `@ghostvue/vue` for headless use, or `GhostTable` from
`@ghostvue/themes` for default cell and header styling.

<GhostExample id="table/team-directory" />

The team directory wraps themed `GhostTable` in a [`GhostCard`](./card.md).
Each member's name is a row header (`scope="row"`), so screen readers announce
it with every cell in the row. Status uses [`GhostBadge`](./badge.md) and row
actions use a [`GhostDropdownMenu`](./dropdown-menu.md) whose icon-only trigger
is named per member. Search filters local data; when nothing matches, a
[`GhostEmptyState`](./empty-state.md) spans the body and offers to clear the
search. Refresh marks the table `aria-busy` and swaps rows for
[`GhostSkeleton`](./skeleton.md) placeholders, and a polite status announces
the result once.

The table uses `contain-horizontal` with `scroll-label="Team members"`. The
example gives the table a `30rem` minimum width through its own class, so on a
phone the columns keep their alignment and the named region scrolls instead of
squeezing the cells. The example styles only its own content (the member
name block and the end-aligned actions column); the recipe supplies cell
padding, row rules, the header band, and a token focus ring on the region.

## Basic use

Always place rows inside `GhostTableHead`, `GhostTableBody`, or
`GhostTableFoot`. Explicit `<tbody>` avoids browser-inserted section mismatches
during SSR hydration.

<GhostExample id="table/basic" />

## API

### `GhostTable`

| Prop                | Type      | Default | Description                                                                                      |
| ------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------ |
| `containHorizontal` | `boolean` | `false` | Wraps the table in `data-part="scroll-container"` for horizontal scroll.                         |
| `scrollLabel`       | `string`  | —       | Accessible name for the scroll region; otherwise uses `GhostTableCaption` via `aria-labelledby`. |

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
`<table>` itself. The scroll container is a `role="region"` with `tabindex="0"`, named via
`scrollLabel` or the table caption, so keyboard users can pan horizontally.

<GhostExample id="table/contain-horizontal" />

## Composable use

<GhostExample id="table/composable" />

## Themed use

<GhostExample id="table/themed" />

The themed root wraps `.ghost-themed-scope` and loads the default recipe. Parts
remain unstyled imports from `@ghostvue/vue`.

The recipe gives column headers a muted band. Row headers (`scope="row"`) in
the body and foot keep the row surface and top alignment, so they read as the
first cell of their row. Numeric columns in this sample align on the end edge
with tabular figures through a class on those cells. With `containHorizontal`,
the scroll region shows the token focus ring, drawn inside its edge so a
clipping ancestor cannot cut it off.

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

Specification: [GhostTable specification](/specs/table).
