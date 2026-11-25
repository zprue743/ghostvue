import { toDisplayString, type FunctionalComponent, type VNodeChild } from 'vue'

import type {
  DataTableHeaderCellProps,
  DataTableRowId,
  DataTableRowProps,
  DataTableSlotRow,
  DataTableSortButtonProps,
  DataTableTableRootProps,
  GhostDataTableSlotProps,
} from './ghost-data-table'

/*
 * Rendering model shared by the default renderers (GhostDataTableTable and
 * GhostDataTablePreset). Both read the root's slot bindings and map them onto
 * the same header, sort button, and cell contract, so the two cannot drift
 * apart. Internal: not exported from the package entry.
 */

export interface DataTableRenderedHeader {
  id: string
  /** Never empty: falls back to the column id, so no `<th>` is blank. */
  label: string
  canSort: boolean
  headerCellProps: DataTableHeaderCellProps
  sortButtonProps: DataTableSortButtonProps
  toggleSort: () => void
}

export interface DataTableRenderedCell {
  columnId: string
  /** Built on demand, so `value` is read only when a slot renders it. */
  slotProps: () => Record<string, unknown>
  /** Column `cell` hook output, or the display string of the value. */
  render: () => VNodeChild
}

export type DataTableRenderedRow<TRowExtra> = TRowExtra & {
  rowId: DataTableRowId
  rowProps: DataTableRowProps
  cells: DataTableRenderedCell[]
}

export interface DataTableRenderedTable<TRowExtra> {
  tableRootProps: DataTableTableRootProps
  headers: DataTableRenderedHeader[]
  rows: DataTableRenderedRow<TRowExtra>[]
}

/** Keeps `ids` order and drops ids the root does not have. */
function pick<T>(
  items: readonly T[],
  idOf: (item: T) => string,
  ids: readonly string[] | undefined,
): T[] {
  if (!ids) return [...items]
  const byId = new Map(items.map((item) => [idOf(item), item]))
  return ids.flatMap((id) => {
    const item = byId.get(id)
    return item === undefined ? [] : [item]
  })
}

/** An empty or missing header falls back to the id, so no `<th>` is blank. */
function headerLabel(header: string | undefined, id: string): string {
  return header === undefined || header === '' ? id : header
}

/**
 * Maps root bindings onto rendered headers and rows. `ids` picks and orders
 * columns (every root column when omitted). `extendRow` adds renderer-specific
 * fields to each body row while the row's typed bindings are still in scope.
 */
export function renderDataTable<TData, TRowExtra>(
  bindings: GhostDataTableSlotProps<TData>,
  ids: readonly string[] | undefined,
  extendRow: (row: DataTableSlotRow<TData>) => TRowExtra,
): DataTableRenderedTable<TRowExtra> {
  return {
    tableRootProps: bindings.tableRootProps,
    headers: pick(bindings.headers, (header) => header.id, ids).map(
      (header) => ({
        id: header.id,
        label: headerLabel(header.column.header, header.id),
        canSort: header.canSort,
        headerCellProps: bindings.getHeaderCellProps(header.id),
        sortButtonProps: bindings.getSortButtonProps(header.id),
        toggleSort: header.toggleSort,
      }),
    ),
    rows: bindings.rows.map((row) => ({
      ...extendRow(row),
      rowId: row.rowId,
      rowProps: bindings.getRowProps(row.rowId),
      cells: pick(row.cells, (cell) => cell.column.id, ids).map((cell) => ({
        columnId: cell.column.id,
        slotProps: () => {
          const value = cell.getValue()
          return {
            row: cell.row,
            rowId: cell.rowId,
            rowIndex: cell.rowIndex,
            column: cell.column,
            value,
            getValue: () => value,
          }
        },
        render: () => {
          const hook = cell.column.cell
          return hook ? hook(cell) : toDisplayString(cell.getValue())
        },
      })),
    })),
  }
}

type DataTableRuntimeSlots = Readonly<
  Record<string, ((props: Record<string, unknown>) => VNodeChild) | undefined>
>

/*
 * A `#<columnId>` slot wins over the column `cell` hook, which wins over the
 * plain value. Slots are looked up at render time because the slot object is
 * not reactive.
 */
export function renderDataTableCell(
  slots: DataTableRuntimeSlots,
  cell: DataTableRenderedCell,
): VNodeChild {
  const slot = slots[cell.columnId]
  return slot ? slot(cell.slotProps()) : cell.render()
}

/*
 * Renders one cell's content (a string, VNode, array, or nothing). The
 * template passes a fresh closure each render, so the cell always updates with
 * the table; reactive reads inside a slot or `cell` hook also re-render just
 * this cell.
 */
export const DataTableCellContent: FunctionalComponent<{
  render: () => VNodeChild
}> = (cellProps) => cellProps.render()
DataTableCellContent.props = ['render']
