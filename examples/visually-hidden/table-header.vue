<script setup lang="ts">
import { GhostVisuallyHidden } from '@ghostvue/vue'
</script>

<template>
  <table>
    <caption>
      Saved reports
    </caption>
    <thead>
      <tr>
        <th scope="col">Report</th>
        <th scope="col">Owner</th>
        <GhostVisuallyHidden as="th" scope="col">Actions</GhostVisuallyHidden>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Q3 revenue</td>
        <td>Priya</td>
        <td>
          <button type="button">Edit</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>
