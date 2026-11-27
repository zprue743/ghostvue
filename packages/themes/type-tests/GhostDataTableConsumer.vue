<script setup lang="ts">
import { useTemplateRef } from 'vue'
import {
  GhostDataTable,
  GhostDataTablePreset,
  GhostDataTableTable,
  defineDataTableColumns,
  type GhostDataTableThemedExposed,
} from '../src/components'

interface Invoice {
  id: string
  amount: number
}

const invoice: Invoice = { id: 'inv-1', amount: 42 }
const data = [invoice]
const helper = defineDataTableColumns<Invoice>()
const columns = [
  helper.accessorKey('amount', { id: 'footer', header: 'Amount' }),
]
const root = useTemplateRef<GhostDataTableThemedExposed<Invoice>>('root')
function firstPage() {
  root.value?.setPageIndex(1)
}
</script>

<template>
  <GhostDataTable
    ref="root"
    :data="data"
    :columns="columns"
    :get-row-id="(row) => row.id"
  >
    <template #default="{ headers }">
      {{ headers[0]?.column.accessorFn?.(invoice, 0) }}
      <GhostDataTableTable :columns="columns">
        <template #footer="{ value }">
          {{ value.toFixed(2) }}
          <!-- @vue-expect-error The column value is numeric. -->
          {{ value.toUpperCase() }}
        </template>
      </GhostDataTableTable>
      <GhostDataTablePreset :columns="columns" :layout-slots="['bulkActions']">
        <template #footer="{ value }">{{ value.toFixed(2) }}</template>
        <template #bulkActions="{ selectedCount, clearSelection }">
          <button type="button" @click="clearSelection">
            {{ selectedCount.toFixed(0) }}
          </button>
        </template>
        <template #detail="{ row }">{{ row.id.toUpperCase() }}</template>
      </GhostDataTablePreset>
      <GhostDataTablePreset :columns="columns" :layout-slots="['footer']">
        <template #footer="footer">
          <button type="button" @click="footer.setPageIndex(1)">
            {{ footer.pageCount }}
          </button>
          <!-- @vue-expect-error Opted-in footer uses pagination props. -->
          {{ footer.value }}
        </template>
      </GhostDataTablePreset>
    </template>
  </GhostDataTable>
  <button type="button" @click="firstPage">First page</button>
</template>
