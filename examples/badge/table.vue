<script setup lang="ts">
import { GhostBadge } from '@ghostvue/themes'
</script>

<template>
  <div>
    <p>
      <GhostBadge>Status: Open</GhostBadge>
      <GhostBadge tone="accent">Priority: High</GhostBadge>
    </p>
    <table>
      <caption>
        Reports
      </caption>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Status</th>
          <th scope="col">Count</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Q3 revenue</td>
          <td><GhostBadge>Active</GhostBadge></td>
          <td><GhostBadge variant="outline">12</GhostBadge></td>
        </tr>
        <tr>
          <td>Q4 forecast</td>
          <td><GhostBadge tone="danger">Overdue</GhostBadge></td>
          <td><GhostBadge variant="outline">3</GhostBadge></td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
