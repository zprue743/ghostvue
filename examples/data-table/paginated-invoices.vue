<script setup lang="ts">
import { ref } from 'vue'
import {
  GhostDataTable,
  GhostEmptyState,
  GhostPagination,
  GhostTable,
  GhostTableBody,
  GhostTableCell,
  GhostTableHead,
  GhostTableHeaderCell,
  GhostTableRow,
  type DataTableColumnDef,
  type DataTablePaginationState,
} from '@ghostvue/vue'

interface Invoice {
  id: string
  customer: string
  amount: number
}

const columns: DataTableColumnDef<Invoice>[] = [
  { id: 'id', header: 'Invoice', accessorKey: 'id' },
  { id: 'customer', header: 'Customer', accessorKey: 'customer' },
  {
    id: 'amount',
    header: 'Amount',
    accessorKey: 'amount',
    cell: ({ row }) => `${row.amount.toFixed(2)} USD`,
  },
]

const customers = ['ACME Corp', 'Globex', 'Initech', 'Umbrella']

// 23 rows at 5 per page: the last page is partial, so clamping is visible.
const data = ref<Invoice[]>(
  Array.from({ length: 23 }, (_, index) => ({
    id: `inv-${String(index + 1).padStart(2, '0')}`,
    customer: customers[index % customers.length] ?? 'ACME Corp',
    amount: 100 + index * 37.5,
  })),
)

const globalFilter = ref('')
const pagination = ref<DataTablePaginationState>({ pageIndex: 1, pageSize: 5 })
</script>

<template>
  <div class="paginated-invoices">
    <label>
      Search invoices
      <input v-model="globalFilter" type="search" />
    </label>
    <GhostDataTable
      v-model:global-filter="globalFilter"
      v-model:pagination="pagination"
      :data="data"
      :columns="columns"
      :get-row-id="(row) => row.id"
      aria-label="Invoices"
    >
      <!--
        The pager reads `pagination`, `pageCount`, and `setPageIndex` from the
        root, so it follows the filtered count (or the server `rowCount`), the
        clamp rules, and shows page 1 of 1 when nothing matches.
      -->
      <template
        #default="{
          tableRootProps,
          headers,
          getHeaderCellProps,
          rows,
          getBodyCellContext,
          pagination: page,
          rowCount,
          pageCount,
          setPageIndex,
        }"
      >
        <GhostTable v-bind="tableRootProps">
          <GhostTableHead>
            <GhostTableRow>
              <GhostTableHeaderCell
                v-for="header in headers"
                :key="header.id"
                v-bind="getHeaderCellProps(header.id)"
              >
                {{ header.column.header }}
              </GhostTableHeaderCell>
            </GhostTableRow>
          </GhostTableHead>
          <GhostTableBody>
            <GhostTableRow v-if="rows.length === 0">
              <GhostTableCell :colspan="headers.length">
                <GhostEmptyState :heading-level="2">
                  <template #title>No invoices</template>
                </GhostEmptyState>
              </GhostTableCell>
            </GhostTableRow>
            <GhostTableRow v-for="row in rows" :key="row.rowId">
              <GhostTableCell v-for="cell in row.cells" :key="cell.column.id">
                <template v-if="cell.column.cell">
                  {{
                    cell.column.cell(
                      getBodyCellContext(row.rowId, cell.column.id),
                    )
                  }}
                </template>
                <template v-else>
                  {{ getBodyCellContext(row.rowId, cell.column.id).getValue() }}
                </template>
              </GhostTableCell>
            </GhostTableRow>
          </GhostTableBody>
        </GhostTable>
        <div class="paginated-invoices__footer">
          <p class="paginated-invoices__status">
            {{ rowCount }} invoices, page {{ page.pageIndex }} of
            {{ pageCount }}
          </p>
          <GhostPagination
            :model-value="page.pageIndex"
            :page-count="pageCount"
            class="paginated-invoices__pager"
            aria-label="Invoice pages"
            @update:model-value="setPageIndex"
          />
        </div>
      </template>
    </GhostDataTable>
  </div>
</template>

<style scoped>
.paginated-invoices {
  display: grid;
  gap: 0.75rem;
}

.paginated-invoices__footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.paginated-invoices__status {
  margin: 0;
}

/* Headless GhostPagination paints nothing; lay the list out in a row. */
.paginated-invoices__pager :deep(.ghost-pagination__list) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.paginated-invoices__pager :deep(button) {
  min-inline-size: 2rem;
  padding: 0.25rem 0.5rem;
}

.paginated-invoices__pager :deep(button[aria-current='page']) {
  background: Highlight;
  color: HighlightText;
}
</style>
