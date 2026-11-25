<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostCheckbox,
  GhostDataTable,
  GhostEmptyState,
  GhostTable,
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
  type DataTableColumnDef,
  type DataTableRowId,
} from '@ghostvue/vue'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const columns: DataTableColumnDef<Invoice>[] = [
  {
    id: 'customer',
    header: 'Customer',
    accessorKey: 'customer',
    enableSorting: true,
  },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    enableSorting: true,
    cell: ({ row }) => `${row.amount.toFixed(2)} USD (${row.customer})`,
  },
]

const data = ref<Invoice[]>([
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
])

const globalFilter = ref('')
const selectedRowIds = ref<DataTableRowId[]>(['inv-2'])
const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
</script>

<template>
  <div>
    <GhostDataTable
      v-model:global-filter="globalFilter"
      v-model:selected-row-ids="selectedRowIds"
      v-model:expanded-row-ids="expandedRowIds"
      :data="data"
      :columns="columns"
      :get-row-id="(row) => row.id"
      :enable-row-selection="true"
      :enable-row-expansion="true"
      aria-label="Invoices"
    >
      <template
        #default="{
          tableRootProps,
          headers,
          getHeaderCellProps,
          getRowProps,
          rows,
          getBodyCellContext,
          getSortButtonProps,
          getRowSelectionCheckboxProps,
          getHeaderSelectionCheckboxProps,
          getRowExpandButtonProps,
          headerSelectionState,
          toggleAllRowsSelected,
        }"
      >
        <label>
          Search
          <input v-model="globalFilter" type="search" />
        </label>
        <GhostTable v-bind="tableRootProps">
          <GhostTableHead>
            <GhostTableRow>
              <GhostTableHeaderCell scope="col" aria-label="Selection">
                <GhostCheckbox
                  v-bind="
                    getHeaderSelectionCheckboxProps({
                      label: 'Select all invoices matching filters',
                    })
                  "
                  :model-value="headerSelectionState.allSelected"
                  :indeterminate="headerSelectionState.someSelected"
                  @update:model-value="toggleAllRowsSelected"
                />
              </GhostTableHeaderCell>
              <GhostTableHeaderCell scope="col">Details</GhostTableHeaderCell>
              <GhostTableHeaderCell
                v-for="header in headers"
                :key="header.id"
                v-bind="getHeaderCellProps(header.id)"
              >
                <button
                  v-if="header.canSort"
                  v-bind="
                    getSortButtonProps(header.id, {
                      label: `${header.column.header} sort`,
                    })
                  "
                  @click="header.toggleSort"
                >
                  {{ header.column.header }}
                </button>
                <template v-else>{{ header.column.header }}</template>
              </GhostTableHeaderCell>
            </GhostTableRow>
          </GhostTableHead>
          <GhostTableBody>
            <GhostTableRow v-if="rows.length === 0">
              <GhostTableCell :colspan="headers.length + 2">
                <GhostEmptyState :heading-level="2">
                  <template #title>No invoices</template>
                </GhostEmptyState>
              </GhostTableCell>
            </GhostTableRow>
            <template v-for="row in rows" :key="row.rowId">
              <GhostTableRow v-bind="getRowProps(row.rowId)">
                <GhostTableCell>
                  <GhostCheckbox
                    v-bind="
                      getRowSelectionCheckboxProps(row.rowId, {
                        label: `Select invoice ${row.rowId}`,
                      })
                    "
                    :model-value="row.isSelected"
                    @update:model-value="row.toggleSelected"
                  />
                </GhostTableCell>
                <GhostTableCell>
                  <button
                    v-bind="
                      getRowExpandButtonProps(row.rowId, {
                        label: `Show details for ${row.rowId}`,
                      })
                    "
                    @click="row.toggleExpanded"
                  >
                    Details
                  </button>
                </GhostTableCell>
                <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                  <template v-if="cell.column.cell">
                    {{
                      cell.column.cell(
                        getBodyCellContext(row.rowId, cell.column.id),
                      )
                    }}
                  </template>
                  <template v-else>
                    {{
                      getBodyCellContext(row.rowId, cell.column.id).getValue()
                    }}
                  </template>
                </GhostTableCell>
              </GhostTableRow>
              <GhostTableRow v-if="row.isExpanded" v-bind="row.detailRowProps">
                <GhostTableCell :colspan="headers.length + 2">
                  Details for {{ row.rowId }}
                </GhostTableCell>
              </GhostTableRow>
            </template>
          </GhostTableBody>
        </GhostTable>
      </template>
    </GhostDataTable>
  </div>
</template>
