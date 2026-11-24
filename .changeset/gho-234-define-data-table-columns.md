---
'@ghostvue/vue': minor
---

Add `defineDataTableColumns<TData>()`, a typed DataTable column factory
(GHO-234). `accessorKey(key, column)` and `accessorFn(id, column)` infer each
column's value type, so `cell` receives a typed `value` and `getValue()`.
Renaming a row key breaks the column at compile time. The builders return
ordinary `DataTableColumnDef<TData>` objects, and generic slot contexts keep
`getValue(): unknown`. Also exports `DataTableColumnHelper`,
`DataTableAccessorKeyColumn`, `DataTableAccessorFnColumn`, and
`DataTableTypedCellContext`.
