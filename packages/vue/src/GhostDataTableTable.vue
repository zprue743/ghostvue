<script
  setup
  lang="ts"
  generic="
    TColumns extends readonly DataTableTableColumnRef[] =
      readonly DataTableColumnDef<unknown>[]
  "
>
import { computed, inject, useSlots, type VNodeChild } from 'vue'

import GhostTable from './GhostTable.vue'
import GhostTableBody from './GhostTableBody.vue'
import GhostTableCell from './GhostTableCell.vue'
import GhostTableHead from './GhostTableHead.vue'
import GhostTableHeaderCell from './GhostTableHeaderCell.vue'
import GhostTableRow from './GhostTableRow.vue'
import {
  DataTableCellContent as CellContent,
  renderDataTable,
  renderDataTableCell,
  type DataTableRenderedCell,
} from './data-table-render'
import type { DataTableColumnDef } from './ghost-data-table'
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
 * The rendering model is shared with GhostDataTablePreset
 * (`data-table-render.ts`).
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

const rendered = computed(() => {
  const ids = props.columns?.map((column) => column.id)
  return table.withBindings((bindings) =>
    renderDataTable(bindings, ids, () => ({})),
  )
})

function renderCell(cell: DataTableRenderedCell): VNodeChild {
  return renderDataTableCell(slots, cell)
}
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
