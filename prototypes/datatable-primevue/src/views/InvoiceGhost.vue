<script setup lang="ts">
import { ref } from 'vue'
import GhostCheckbox from '../stubs/GhostCheckbox.vue'
import GhostEmptyState from '../stubs/GhostEmptyState.vue'
import GhostTable from '../stubs/GhostTable.vue'
import GhostTableBody from '../stubs/GhostTableBody.vue'
import GhostTableCell from '../stubs/GhostTableCell.vue'
import GhostTableHead from '../stubs/GhostTableHead.vue'
import GhostTableHeaderCell from '../stubs/GhostTableHeaderCell.vue'
import GhostTableRow from '../stubs/GhostTableRow.vue'
import GhostDataTable from '../ghostvue/GhostDataTable.vue'
import { defineDataTableColumns } from '../ghostvue/defineDataTableColumns'
import type { DataTableColumnDef, DataTableRowId } from '../ghostvue/types'
import { approvalFixtureInvoices, type Invoice } from '../data/invoices'

const props = defineProps<{
  data?: Invoice[]
  dataTestId?: string
}>()

const invoiceData = ref(props.data ?? [...approvalFixtureInvoices])

const helper = defineDataTableColumns<Invoice>()
const columns: DataTableColumnDef<Invoice>[] = [
  helper.accessorKey('customer', { header: 'Customer', enableSorting: true }),
  helper.accessorKey('amount', {
    header: 'Amount',
    enableSorting: true,
    cell: ({ row }) => `${row.amount.toFixed(2)} USD (${row.customer})`,
  }),
]

const globalFilter = ref('')
const selectedRowIds = ref<DataTableRowId[]>(['inv-2'])
const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
</script>

<template>
  <div class="screen" :data-testid="dataTestId ?? 'invoice-ghost'">
    <h1>GhostVue headless prototype</h1>
    <GhostDataTable
      v-model:global-filter="globalFilter"
      v-model:selected-row-ids="selectedRowIds"
      v-model:expanded-row-ids="expandedRowIds"
      :data="invoiceData"
      :columns="columns"
      :get-row-id="(row) => row.id"
      :enable-row-selection="true"
      :enable-row-expansion="true"
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
        <label class="search">
          Search
          <input v-model="globalFilter" type="search" data-testid="global-filter" />
        </label>
        <GhostTable v-bind="tableRootProps">
          <GhostTableHead>
            <GhostTableRow>
              <GhostTableHeaderCell scope="col">
                <GhostCheckbox
                  v-bind="
                    getHeaderSelectionCheckboxProps({
                      label: 'Select all invoices matching filters',
                    })
                  "
                  data-testid="header-select-all"
                  :model-value="headerSelectionState.allSelected"
                  :indeterminate="headerSelectionState.someSelected"
                  @update:model-value="toggleAllRowsSelected"
                />
              </GhostTableHeaderCell>
              <GhostTableHeaderCell scope="col">Details</GhostTableHeaderCell>
              <GhostTableHeaderCell
                v-for="header in headers"
                :key="header.column.id"
                v-bind="getHeaderCellProps(header.column.id)"
              >
                <button
                  v-if="header.column.enableSorting"
                  v-bind="
                    getSortButtonProps(header.column.id, {
                      label: `${header.column.header} sort`,
                    })
                  "
                  :data-testid="`sort-${header.column.id}`"
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
                <GhostEmptyState>
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
                    :data-testid="`select-${row.rowId}`"
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
                    :data-testid="`expand-${row.rowId}`"
                    @click="() => row.toggleExpanded()"
                  >
                    Details
                  </button>
                </GhostTableCell>
                <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                  <template v-if="cell.column.cell">
                    {{ cell.column.cell(getBodyCellContext(row.rowId, cell.column.id)) }}
                  </template>
                  <template v-else>
                    {{ getBodyCellContext(row.rowId, cell.column.id).getValue() }}
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

<style scoped>
.screen {
  font-family: system-ui, sans-serif;
  max-width: 56rem;
  margin: 0 auto;
  padding: 1rem;
}
.search {
  display: block;
  margin-bottom: 0.75rem;
}
</style>