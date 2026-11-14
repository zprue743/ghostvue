<script setup lang="ts">
import { GhostEmptyState } from '@ghostvue/vue'
</script>

<template>
  <table>
    <caption>
      Quarterly revenue
    </caption>
    <thead>
      <tr>
        <th scope="col">Region</th>
        <th scope="col">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td colspan="2">
          <GhostEmptyState :heading-level="2">
            <template #title>No rows for this quarter</template>
            <template #description>
              Import a CSV or connect a data source to populate the table.
            </template>
          </GhostEmptyState>
        </td>
      </tr>
    </tbody>
  </table>
</template>
