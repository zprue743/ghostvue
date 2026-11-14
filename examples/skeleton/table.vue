<script setup lang="ts">
import { GhostSkeleton } from '@ghostvue/themes'
</script>

<template>
  <table aria-busy="true">
    <caption>
      Loading reports
    </caption>
    <thead>
      <tr>
        <th scope="col">Report</th>
        <th scope="col">Owner</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="row in 3" :key="row">
        <GhostSkeleton as="td" />
        <GhostSkeleton as="td" style="inline-size: 8rem" />
        <td>
          <GhostSkeleton shape="circle" style="inline-size: 1.5rem" />
        </td>
      </tr>
    </tbody>
  </table>
</template>
