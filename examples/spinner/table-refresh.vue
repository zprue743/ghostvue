<script setup lang="ts">
import { GhostSpinner } from '@ghostvue/themes'
</script>

<template>
  <table aria-busy="true">
    <caption>
      Reports
      <GhostSpinner label="Refreshing reports" />
    </caption>
    <thead>
      <tr>
        <th>Name</th>
        <th>Owner</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Q3 revenue</td>
        <td>Priya</td>
      </tr>
    </tbody>
  </table>
</template>
