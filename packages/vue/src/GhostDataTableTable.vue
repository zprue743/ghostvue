<script
  setup
  lang="ts"
  generic="
    TColumns extends readonly DataTableTableColumnRef[] =
      readonly DataTableColumnDef<unknown>[]
  "
>
import {
  computed,
  inject,
  toDisplayString,
  useSlots,
  type FunctionalComponent,
  type VNodeChild,
} from 'vue'

import GhostTable from './GhostTable.vue'
import GhostTableBody from './GhostTableBody.vue'
import GhostTableCell from './GhostTableCell.vue'
import GhostTableHead from './GhostTableHead.vue'
import GhostTableHeaderCell from './GhostTableHeaderCell.vue'
import GhostTableRow from './GhostTableRow.vue'
import type {
  DataTableColumnDef,
  DataTableHeaderCellProps,
  DataTableRowId,
  DataTableRowProps,
  DataTableSortButtonProps,
  DataTableTableRootProps,
  GhostDataTableSlotProps,
} from './ghost-data-table'
import {
  ghostDataTableContextKey,
  type DataTableTableColumnRef,
  type GhostDataTableTableProps,
  type GhostDataTableTableSlots,
} from './ghost-data-table-table'

/*
 * Default renderer for example (a): maps the parent GhostDataTable's headers
 * and rows onto native GhostTable parts. It reads the root's slot bindings,
 * so headers, `aria-sort`, sort buttons, and row data attributes follow the
 * same contract as a manual composition. Attributes such as `class`, `style`,
 * `contain-horizontal`, or `aria-label` fall through to GhostTable.
 *
 * A sortable header renders a native sort button named by its visible text;
 * `aria-sort` stays on the `<th>` (getHeaderCellProps), never the button.
 */

const props = defineProps<GhostDataTableTableProps<TColumns>>()

defineSlots<GhostDataTableTableSlots<TColumns>>()

// Runtime lookup by column id (see renderCell); `defineSlots` carries the types.
const slots = useSlots()

const context = inject(ghostDataTableContextKey, null)
if (!context) {
  throw new Error('GhostDataTableTable must be used inside GhostDataTable')
}
const table = context

interface RenderedHeader {
  id: string
  /** Never empty: falls back to the column id, so no `<th>` is blank. */
  label: string
  canSort: boolean
  headerCellProps: DataTableHeaderCellProps
  sortButtonProps: DataTableSortButtonProps
  toggleSort: () => void
}

interface RenderedCell {
  columnId: string
  /** Built on demand, so `value` is read only when a slot renders it. */
  slotProps: () => Record<string, unknown>
  /** Column `cell` hook output, or the display string of the value. */
  render: () => VNodeChild
}

interface RenderedRow {
  rowId: DataTableRowId
  rowProps: DataTableRowProps
  cells: RenderedCell[]
}

interface RenderedTable {
  tableRootProps: DataTableTableRootProps
  headers: RenderedHeader[]
  rows: RenderedRow[]
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

function renderTable<TData>(
  bindings: GhostDataTableSlotProps<TData>,
  ids: readonly string[] | undefined,
): RenderedTable {
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

const rendered = computed(() => {
  const ids = props.columns?.map((column) => column.id)
  return table.withBindings((bindings) => renderTable(bindings, ids))
})

/*
 * A `#<columnId>` slot wins over the column `cell` hook, which wins over the
 * plain value. Slots are looked up at render time because the slot object is
 * not reactive.
 */
function renderCell(cell: RenderedCell): VNodeChild {
  const slot = slots[cell.columnId]
  return slot ? slot(cell.slotProps()) : cell.render()
}

/*
 * Renders one cell's content (a string, VNode, array, or nothing). The
 * template passes a fresh closure each render, so the cell always updates with
 * the table; reactive reads inside a slot or `cell` hook also re-render just
 * this cell.
 */
const CellContent: FunctionalComponent<{ render: () => VNodeChild }> = (
  cellProps,
) => cellProps.render()
CellContent.props = ['render']
</script>

<template>
  <GhostTable v-bind="rendered.tableRootProps">
    <GhostTableHead>
      <GhostTableRow>
        <GhostTableHeaderCell
          v-for="header in rendered.headers"
          :key="header.id"
          v-bind="header.headerCellProps"
        >
          <button
            v-if="header.canSort"
            v-bind="header.sortButtonProps"
            @click="header.toggleSort"
          >
            {{ header.label }}
          </button>
          <template v-else>{{ header.label }}</template>
        </GhostTableHeaderCell>
      </GhostTableRow>
    </GhostTableHead>
    <GhostTableBody>
      <GhostTableRow
        v-for="row in rendered.rows"
        :key="row.rowId"
        v-bind="row.rowProps"
      >
        <GhostTableCell v-for="cell in row.cells" :key="cell.columnId">
          <CellContent :render="() => renderCell(cell)" />
        </GhostTableCell>
      </GhostTableRow>
    </GhostTableBody>
  </GhostTable>
</template>
