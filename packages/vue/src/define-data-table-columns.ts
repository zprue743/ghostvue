import type { VNodeChild } from 'vue'

import type {
  DataTableCellContext,
  DataTableColumnDef,
} from './ghost-data-table'

/*
 * Typed column factory (docs/components/data-table-spec.md §Types,
 * "getValue() typing policy"). `DataTableColumnDef<TData>` keeps
 * `getValue(): unknown` because one column array mixes value types; this
 * helper recovers the per-column value type at the definition site only, then
 * returns the ordinary column shape so `useGhostDataTable`, `GhostDataTable`,
 * and generic slots need no change.
 */

/**
 * Cell context for a column built with {@link defineDataTableColumns}. Same
 * fields as {@link DataTableCellContext}, plus `value` and a typed `getValue`.
 */
export type DataTableTypedCellContext<TData, TValue> = Omit<
  DataTableCellContext<TData>,
  'getValue'
> & {
  /** This cell's value, read once from the column accessor. */
  value: TValue
  /** Returns {@link DataTableTypedCellContext.value}. */
  getValue: () => TValue
}

/**
 * Column options for {@link DataTableColumnHelper.accessorKey}. `id` defaults
 * to the key.
 *
 * `accessorFn` is omitted on purpose: at runtime an `accessorFn` wins over
 * `accessorKey`, so allowing both would make the typed `value` lie. Use
 * {@link DataTableColumnHelper.accessorFn} for derived values.
 */
export type DataTableAccessorKeyColumn<
  TData,
  K extends keyof TData & string,
> = Omit<
  DataTableColumnDef<TData>,
  'accessorKey' | 'accessorFn' | 'id' | 'cell'
> & {
  /** @default the accessor key */
  id?: string
  /** Render hook with the typed value of `row[key]`. */
  cell?: (context: DataTableTypedCellContext<TData, TData[K]>) => VNodeChild
}

/**
 * Column options for {@link DataTableColumnHelper.accessorFn}. The column
 * value type is inferred from the `accessorFn` return type. `accessorKey` is
 * omitted because `accessorFn` would shadow it at runtime.
 */
export type DataTableAccessorFnColumn<TData, TValue> = Omit<
  DataTableColumnDef<TData>,
  'accessorKey' | 'accessorFn' | 'id' | 'cell'
> & {
  accessorFn: (row: TData, index: number) => TValue
  /** Render hook with the typed `accessorFn` result. */
  cell?: (context: DataTableTypedCellContext<TData, TValue>) => VNodeChild
}

/** Builders returned by {@link defineDataTableColumns}. */
export interface DataTableColumnHelper<TData> {
  /**
   * Column that reads `row[key]`. `key` must be a string key of `TData`, so
   * renaming the row property breaks the definition at compile time.
   */
  accessorKey: <K extends keyof TData & string>(
    key: K,
    column: DataTableAccessorKeyColumn<TData, K>,
  ) => DataTableColumnDef<TData>
  /** Column whose value comes from `accessorFn`. `id` is required. */
  accessorFn: <TValue>(
    id: string,
    column: DataTableAccessorFnColumn<TData, TValue>,
  ) => DataTableColumnDef<TData>
}

/**
 * Typed column factory for DataTable. Pass the row type once; each builder
 * infers the column's value type so `cell` receives a typed `value` and
 * `getValue()`:
 *
 * ```ts
 * const columns = defineDataTableColumns<Invoice>()
 * const defs = [
 *   columns.accessorKey('amount', {
 *     header: 'Amount',
 *     cell: ({ value }) => `${value.toFixed(2)} USD`,
 *   }),
 * ]
 * ```
 *
 * Holds no state and does not touch Vue reactivity. Each builder returns a
 * new {@link DataTableColumnDef} and never mutates the options object.
 * Generic contexts (for example `getBodyCellContext` in the `GhostDataTable`
 * slot) still type `getValue()` as `unknown`, because one column array mixes
 * value types.
 */
export function defineDataTableColumns<TData>(): DataTableColumnHelper<TData> {
  return {
    accessorKey(key, column) {
      const { cell, id, ...rest } = column
      const def: DataTableColumnDef<TData> = {
        ...rest,
        id: id ?? key,
        accessorKey: key,
      }
      if (cell) {
        // Reading `row[key]` here, rather than casting `context.getValue()`,
        // keeps `value` typed without an assertion. It is the same read the
        // pipeline's `getCellValue` performs for an accessorKey column.
        def.cell = (context) => cell(typedContext(context, context.row[key]))
      }
      return def
    },
    accessorFn(id, column) {
      const { cell, accessorFn, ...rest } = column
      const def: DataTableColumnDef<TData> = { ...rest, id, accessorFn }
      if (cell) {
        def.cell = (context) =>
          cell(typedContext(context, accessorFn(context.row, context.rowIndex)))
      }
      return def
    },
  }
}

/*
 * Builds a fresh context (the incoming one may be a cached slot binding, and
 * the library never mutates contexts it hands out). The value is read once
 * per `cell` call so `value` and `getValue()` always agree.
 */
function typedContext<TData, TValue>(
  context: DataTableCellContext<TData>,
  value: TValue,
): DataTableTypedCellContext<TData, TValue> {
  return {
    row: context.row,
    rowId: context.rowId,
    rowIndex: context.rowIndex,
    column: context.column,
    value,
    getValue: () => value,
  }
}
