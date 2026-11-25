import type { InjectionKey } from 'vue'

import type { DataTableTypedCellContext } from './define-data-table-columns'
import type { GhostDataTableSlotProps } from './ghost-data-table'

/*
 * GhostDataTableTable default renderer (GHO-241; spec "Default rendering
 * convenience" and example (a)). The renderer is a child of the renderless
 * `GhostDataTable` root and reads the same slot bindings the root hands to a
 * manual composition, so both paths share one header, sort, and cell
 * contract.
 */

/** Minimal column shape `GhostDataTableTable` reads from its `columns` prop. */
export interface DataTableTableColumnRef {
  readonly id: string
}

/**
 * Row type of a column definition, read from its `accessorFn` parameter
 * (present, optional, on every `DataTableColumnDef<TData>`).
 */
export type DataTableColumnRow<TColumn> = TColumn extends {
  accessorFn?: (row: infer TData, index: number) => unknown
}
  ? TData
  : unknown

/**
 * Value type of a column. Columns from `defineDataTableColumns` keep their
 * literal accessor, so this is `row[key]` or the `accessorFn` return type.
 * Hand-written `DataTableColumnDef` objects give `unknown`, matching the
 * generic `getValue(): unknown` policy.
 */
export type DataTableColumnValue<TColumn> = TColumn extends {
  accessorFn: (row: never, index: number) => infer TValue
}
  ? TValue
  : TColumn extends { accessorKey: infer K }
    ? K extends keyof DataTableColumnRow<TColumn>
      ? DataTableColumnRow<TColumn>[K]
      : unknown
    : unknown

/**
 * Props of a `#<columnId>` cell slot: the cell context plus the cell `value`
 * (read once per render) and a `getValue()` that returns it.
 */
export type GhostDataTableTableCellSlotProps<TData, TValue> =
  DataTableTypedCellContext<TData, TValue>

/**
 * Slots of {@link GhostDataTableTable}: one optional cell slot per column id.
 * With a `columns` array from `defineDataTableColumns`, each slot's `value` is
 * typed from its column; otherwise slot names are any string and `value` is
 * `unknown`.
 */
export type GhostDataTableTableSlots<
  TColumns extends readonly DataTableTableColumnRef[],
> = {
  [TColumn in TColumns[number] as TColumn['id']]?: (
    props: GhostDataTableTableCellSlotProps<
      DataTableColumnRow<TColumn>,
      DataTableColumnValue<TColumn>
    >,
  ) => unknown
}

/** Props for {@link GhostDataTableTable}. */
export interface GhostDataTableTableProps<
  TColumns extends readonly DataTableTableColumnRef[],
> {
  /**
   * Columns to render, in order, matched to the parent `GhostDataTable`
   * columns by `id` (ids the parent does not have are skipped). Defaults to
   * every parent column. Pass the same array you give `GhostDataTable` to
   * type the `#<columnId>` slots.
   */
  columns?: TColumns
}

/**
 * What `GhostDataTable` provides to its rendering children. The row type is
 * hidden behind a generic callback (an existential), so a child can read the
 * root's typed bindings without the root's `TData` and without a cast.
 * Reading inside a `computed` tracks the root's reactive bindings.
 */
export interface GhostDataTableContext {
  withBindings: <TResult>(
    read: <TData>(bindings: GhostDataTableSlotProps<TData>) => TResult,
  ) => TResult
  /*
   * Root state GhostDataTablePreset reads beyond the slot bindings. Getters,
   * so a read inside `computed` or render tracks the root.
   */
  /** Current global filter value (controlled prop or internal state). */
  globalFilter: () => unknown
  /** Commits a global filter through the root (page reset and `stateChange`). */
  setGlobalFilter: (globalFilter: unknown) => void
  /** Resolved `enableRowSelection`. */
  rowSelectionEnabled: () => boolean
  /** Resolved `enableRowExpansion`. */
  rowExpansionEnabled: () => boolean
  /** Resolved `disabled`. */
  disabled: () => boolean
  /** True when any root column takes part in the global filter. */
  hasGlobalFilterColumns: () => boolean
}

export const ghostDataTableContextKey: InjectionKey<GhostDataTableContext> =
  Symbol('ghost-data-table')
