---
'@ghostvue/vue': minor
---

Add `GhostDataTableTable` (GHO-241), the default renderer for `GhostDataTable`.
Place it inside the root to render a native `GhostTable` with a header row, a
sort button in each sortable header (`aria-sort` stays on the `<th>`), and one
body row per rendered row. Each column id is an optional
`#<columnId>="{ row, rowId, rowIndex, column, value, getValue }"` cell slot.
Pass the same column array to its optional `columns` prop to type each slot's
`value`; the prop also picks and orders the rendered columns by id.

`defineDataTableColumns` builders now return their column with its literal
`id` and accessor type (`DataTableAccessorKeyColumnDef`,
`DataTableAccessorFnColumnDef`). Both still extend `DataTableColumnDef<TData>`.
