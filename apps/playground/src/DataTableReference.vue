<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostCheckbox,
  GhostDataTable,
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
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  { id: 'amount', header: 'Amount', accessorKey: 'amount' },
]

const data: Invoice[] = [
  { id: 'inv-1', customer: 'ACME Corp', amount: 1200 },
  { id: 'inv-2', customer: 'Globex', amount: 980.5 },
  { id: 'inv-3', customer: 'Initech', amount: 42 },
]

const selectedRowIds = ref<DataTableRowId[]>([])
const expandedRowIds = ref<DataTableRowId[]>(['inv-2'])
</script>

<!--
  Browser fixture for the DataTable interaction prop helpers (GHO-236), for
  behaviors example (b) does not cover: a custom, icon-only sort header whose
  name comes only from the helper label, and a detail row with its own focusable
  control so collapsing it from inside exercises focus restore.
-->
<template>
  <section
    aria-labelledby="data-table-reference-heading"
    data-testid="data-table-reference"
  >
    <h2 id="data-table-reference-heading">GhostDataTable interactions</h2>
    <GhostDataTable
      v-model:selected-row-ids="selectedRowIds"
      v-model:expanded-row-ids="expandedRowIds"
      :data="data"
      :columns="columns"
      :get-row-id="(row) => row.id"
      :enable-row-selection="true"
      :enable-row-expansion="true"
      aria-labelledby="data-table-reference-heading"
    >
      <template
        #default="{
          tableRootProps,
          headers,
          rows,
          headerSelectionState,
          toggleAllRowsSelected,
          getHeaderCellProps,
          getRowProps,
          getSortButtonProps,
          getHeaderSelectionCheckboxProps,
          getRowSelectionCheckboxProps,
          getRowExpandButtonProps,
        }"
      >
        <GhostTable v-bind="tableRootProps" class="data-table-reference-table">
          <GhostTableHead>
            <GhostTableRow>
              <GhostTableHeaderCell scope="col" aria-label="Selection">
                <GhostCheckbox
                  v-bind="
                    getHeaderSelectionCheckboxProps({
                      label: 'Select every reference invoice',
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
                <span class="data-table-reference-header">
                  {{ header.column.header }}
                  <!-- Icon-only: the helper label is the button's whole name. -->
                  <button
                    v-bind="
                      getSortButtonProps(header.id, {
                        label: `Order invoices by ${header.column.header}`,
                      })
                    "
                    :data-testid="`reference-sort-${header.id}`"
                    @click="header.toggleSort"
                  >
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 16 16"
                      width="12"
                      height="12"
                    >
                      <path
                        v-if="header.sortDirection === 'asc'"
                        d="M8 3l5 8H3z"
                        fill="currentColor"
                      />
                      <path
                        v-else-if="header.sortDirection === 'desc'"
                        d="M8 13L3 5h10z"
                        fill="currentColor"
                      />
                      <path
                        v-else
                        d="M8 2l4 5H4zM8 14l-4-5h8z"
                        fill="currentColor"
                      />
                    </svg>
                  </button>
                </span>
              </GhostTableHeaderCell>
            </GhostTableRow>
          </GhostTableHead>
          <GhostTableBody>
            <template v-for="row in rows" :key="row.rowId">
              <GhostTableRow v-bind="getRowProps(row.rowId)">
                <GhostTableCell>
                  <GhostCheckbox
                    v-bind="
                      getRowSelectionCheckboxProps(row.rowId, {
                        label: `Select reference invoice ${row.rowId}`,
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
                        label: `Reference details for ${row.rowId}`,
                      })
                    "
                    @click="row.toggleExpanded"
                  >
                    Details
                  </button>
                </GhostTableCell>
                <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                  {{ cell.getValue() }}
                </GhostTableCell>
              </GhostTableRow>
              <GhostTableRow v-if="row.isExpanded" v-bind="row.detailRowProps">
                <GhostTableCell :colspan="headers.length + 2">
                  Reference details for {{ row.rowId }}.
                  <button type="button" @click="row.toggleExpanded">
                    Hide details for {{ row.rowId }}
                  </button>
                </GhostTableCell>
              </GhostTableRow>
            </template>
          </GhostTableBody>
        </GhostTable>
      </template>
    </GhostDataTable>
  </section>
</template>

<style scoped>
/*
 * Fixed layout keeps the fixture inside a 320px viewport without adding a
 * second scroll region to the playground page.
 */
.data-table-reference-table {
  width: 100%;
  table-layout: fixed;
  overflow-wrap: anywhere;
}

.data-table-reference-header {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
</style>
