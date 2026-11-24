import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

import {
  getDataTableHeaderCellProps,
  getDataTableHeaderSelectionCheckboxProps,
  getDataTableRowExpandButtonProps,
  getDataTableRowSelectionCheckboxProps,
  getDataTableSortButtonProps,
  useDataTableDetailRowFocus,
} from './data-table-interaction'
import { getCellValue } from './data-table-processing'
import type {
  DataTableCellContext,
  DataTableColumnDef,
  DataTableControlLabelOptions,
  DataTableDetailRowProps,
  DataTableExpandButtonProps,
  DataTableHeader,
  DataTableHeaderCellProps,
  DataTableRowId,
  DataTableRowProps,
  DataTableSelectionCheckboxProps,
  DataTableSlotRow,
  DataTableSortButtonProps,
  DataTableTableRootProps,
  GhostDataTableSlotProps,
  UseGhostDataTableReturn,
} from './ghost-data-table'

export interface DataTableSlotBindingOptions<TData> {
  columns: MaybeRefOrGetter<readonly DataTableColumnDef<TData>[]>
  /** SSR-stable prefix for detail row ids (`useId`-based). */
  baseId: MaybeRefOrGetter<string>
  ariaLabel?: MaybeRefOrGetter<string | undefined>
  ariaLabelledby?: MaybeRefOrGetter<string | undefined>
}

/**
 * `encodeURIComponent` keeps ids whitespace-free (an IDREF in `aria-controls`
 * cannot contain spaces) and injective, so `'a b'` and `'a_b'` never collide.
 * The `typeof` tag keeps numeric `1` and string `'1'` apart as well.
 */
function rowIdToken(rowId: DataTableRowId): string {
  return `${typeof rowId === 'number' ? 'n' : 's'}${encodeURIComponent(String(rowId))}`
}

/**
 * Builds the GhostDataTable default-slot bindings on top of a
 * {@link useGhostDataTable} instance. Internal to the root component; the
 * control prop getters delegate to the public interaction helpers in
 * `data-table-interaction.ts` and add the root's generated ids, and this is
 * where focus-on-collapse is installed for the expand buttons.
 *
 * Header models depend only on columns and sorting, so the head stays mounted
 * when the body is empty. Cell contexts are cached per row model, so toggling
 * selection or expansion never re-runs sort, filter, or accessor callbacks.
 */
export function useDataTableSlotBindings<TData>(
  table: UseGhostDataTableReturn<TData>,
  options: DataTableSlotBindingOptions<TData>,
): ComputedRef<GhostDataTableSlotProps<TData>> {
  const columns = computed(() => toValue(options.columns))

  const tableRootProps = computed((): DataTableTableRootProps => {
    const props: DataTableTableRootProps = { 'data-ghost-data-table': '' }
    if (table.loading.value) props['aria-busy'] = 'true'
    const label = toValue(options.ariaLabel)
    if (label) props['aria-label'] = label
    const labelledby = toValue(options.ariaLabelledby)
    if (labelledby) props['aria-labelledby'] = labelledby
    return props
  })

  const headers = computed((): DataTableHeader<TData>[] =>
    columns.value.map((column) => ({
      id: column.id,
      column,
      canSort: table.canSort(column.id),
      sortDirection: table.getSortDirection(column.id),
      toggleSort: () => {
        table.toggleSorting(column.id)
      },
    })),
  )

  /*
   * Cell contexts depend on the rendered row model and columns only. Keyed by
   * row id so `getBodyCellContext` is a map lookup during render.
   */
  const cellsByRowId = computed(() => {
    const map = new Map<DataTableRowId, DataTableCellContext<TData>[]>()
    for (const entry of table.getRowModel()) {
      map.set(
        entry.rowId,
        columns.value.map((column) => ({
          row: entry.row,
          rowId: entry.rowId,
          rowIndex: entry.rowIndex,
          column,
          getValue: () => getCellValue(column, entry.row, entry.rowIndex),
        })),
      )
    }
    return map
  })

  function detailRowId(rowId: DataTableRowId): string {
    return `${toValue(options.baseId)}-detail-${rowIdToken(rowId)}`
  }

  function expandButtonId(rowId: DataTableRowId): string {
    return `${toValue(options.baseId)}-expand-${rowIdToken(rowId)}`
  }

  function getDetailRowProps(rowId: DataTableRowId): DataTableDetailRowProps {
    return { id: detailRowId(rowId), 'data-detail-row': 'true' }
  }

  const rows = computed((): DataTableSlotRow<TData>[] =>
    table.getRowModel().map((entry) => ({
      row: entry.row,
      rowId: entry.rowId,
      rowIndex: entry.rowIndex,
      cells: cellsByRowId.value.get(entry.rowId) ?? [],
      isSelected: table.isRowSelected(entry.rowId),
      isExpanded: table.isRowExpanded(entry.rowId),
      toggleSelected: (value?: boolean) => {
        table.toggleRowSelected(entry.rowId, value)
      },
      toggleExpanded: () => {
        table.toggleRowExpanded(entry.rowId)
      },
      detailRowProps: getDetailRowProps(entry.rowId),
    })),
  )

  function getHeaderCellProps(columnId: string): DataTableHeaderCellProps {
    return getDataTableHeaderCellProps(table, columnId)
  }

  function getRowProps(rowId: DataTableRowId): DataTableRowProps {
    const props: DataTableRowProps = {}
    if (table.isRowSelected(rowId)) props['data-selected'] = 'true'
    if (table.isRowExpanded(rowId)) props['data-expanded'] = 'true'
    return props
  }

  function getBodyCellContext(
    rowId: DataTableRowId,
    columnId: string,
  ): DataTableCellContext<TData> {
    const cell = cellsByRowId.value
      .get(rowId)
      ?.find((context) => context.column.id === columnId)
    if (!cell) {
      throw new Error(
        `GhostDataTable: no rendered cell for row "${String(rowId)}" and column "${columnId}".`,
      )
    }
    return cell
  }

  function getSortButtonProps(
    columnId: string,
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableSortButtonProps {
    return getDataTableSortButtonProps(table, columnId, controlOptions)
  }

  function getRowSelectionCheckboxProps(
    rowId: DataTableRowId,
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableSelectionCheckboxProps {
    return getDataTableRowSelectionCheckboxProps(table, rowId, controlOptions)
  }

  function getHeaderSelectionCheckboxProps(
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableSelectionCheckboxProps {
    return getDataTableHeaderSelectionCheckboxProps(table, controlOptions)
  }

  /*
   * The root owns both ids so focus-on-collapse can find the button, and
   * `aria-controls` always matches `detailRowProps.id`; they override any
   * id a caller smuggles in through the options object.
   */
  function getRowExpandButtonProps(
    rowId: DataTableRowId,
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableExpandButtonProps {
    return getDataTableRowExpandButtonProps(table, rowId, {
      ...controlOptions,
      id: expandButtonId(rowId),
      detailRowId: detailRowId(rowId),
    })
  }

  useDataTableDetailRowFocus(table, { detailRowId, expandButtonId })

  function toggleAllRowsSelected(value?: boolean): void {
    table.toggleAllRowsSelected(value)
  }

  return computed(() => ({
    tableRootProps: tableRootProps.value,
    headers: headers.value,
    rows: rows.value,
    headerSelectionState: table.headerSelectionState.value,
    getHeaderCellProps,
    getRowProps,
    getBodyCellContext,
    getSortButtonProps,
    getRowSelectionCheckboxProps,
    getHeaderSelectionCheckboxProps,
    getRowExpandButtonProps,
    toggleAllRowsSelected,
  }))
}
