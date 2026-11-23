import { computed, toValue, type ComputedRef, type MaybeRefOrGetter } from 'vue'

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
  enableRowSelection: MaybeRefOrGetter<boolean>
  enableRowExpansion: MaybeRefOrGetter<boolean>
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
 * {@link useGhostDataTable} instance. Internal to the root component for now;
 * the prop getters return attributes only (no listeners), so spreading them
 * next to an explicit `@click` / `@update:model-value` never doubles a toggle.
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
    const direction = table.getSortDirection(columnId)
    if (direction === false) return { scope: 'col' }
    return {
      scope: 'col',
      'aria-sort': direction === 'asc' ? 'ascending' : 'descending',
      'data-sort': direction,
    }
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

  const withLabel = <T extends object>(
    props: T,
    controlOptions: DataTableControlLabelOptions | undefined,
  ): T & { 'aria-label'?: string } =>
    controlOptions?.label
      ? { ...props, 'aria-label': controlOptions.label }
      : props

  function getSortButtonProps(
    columnId: string,
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableSortButtonProps {
    const props: DataTableSortButtonProps = { type: 'button' }
    if (table.disabled.value || !table.canSort(columnId)) props.disabled = true
    return withLabel(props, controlOptions)
  }

  const selectionInert = (): boolean =>
    !toValue(options.enableRowSelection) || table.disabled.value
  const expansionInert = (): boolean =>
    !toValue(options.enableRowExpansion) || table.disabled.value

  function getRowSelectionCheckboxProps(
    _rowId: DataTableRowId,
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableSelectionCheckboxProps {
    return withLabel({ disabled: selectionInert() }, controlOptions)
  }

  function getHeaderSelectionCheckboxProps(
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableSelectionCheckboxProps {
    return withLabel({ disabled: selectionInert() }, controlOptions)
  }

  function getRowExpandButtonProps(
    rowId: DataTableRowId,
    controlOptions?: DataTableControlLabelOptions,
  ): DataTableExpandButtonProps {
    const expanded = table.isRowExpanded(rowId)
    const props: DataTableExpandButtonProps = {
      type: 'button',
      'aria-expanded': expanded ? 'true' : 'false',
    }
    if (expanded) props['aria-controls'] = detailRowId(rowId)
    if (expansionInert()) props.disabled = true
    return withLabel(props, controlOptions)
  }

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
