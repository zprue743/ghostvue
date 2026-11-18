<script setup lang="ts">
import {
  GhostTree,
  GhostTreeGroup,
  GhostTreeItem,
  GhostTreeTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <!-- In RTL, ArrowLeft expands or enters a branch and ArrowRight collapses or returns to the parent. -->
  <div dir="rtl" lang="ar">
    <GhostTree aria-label="المستندات" dir="rtl">
      <GhostTreeItem value="reports">
        <template #default="{ expanded }">
          <GhostTreeTrigger>
            <span aria-hidden="true">{{ expanded ? '▾' : '◂' }} </span>التقارير
          </GhostTreeTrigger>
          <GhostTreeGroup>
            <GhostTreeItem value="q1">
              <GhostTreeTrigger>الربع الأول</GhostTreeTrigger>
            </GhostTreeItem>
            <GhostTreeItem value="q2">
              <GhostTreeTrigger>الربع الثاني</GhostTreeTrigger>
            </GhostTreeItem>
          </GhostTreeGroup>
        </template>
      </GhostTreeItem>
      <GhostTreeItem value="invoices">
        <GhostTreeTrigger>الفواتير</GhostTreeTrigger>
      </GhostTreeItem>
    </GhostTree>
  </div>
</template>
