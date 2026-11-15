<script setup lang="ts">
import {
  GhostBreadcrumb,
  GhostBreadcrumbItem,
  GhostBreadcrumbLink,
  GhostBreadcrumbList,
  GhostBreadcrumbPage,
  GhostBreadcrumbSeparator,
} from '@ghostvue/vue'
</script>

<template>
  <GhostBreadcrumb aria-label="Project trail">
    <GhostBreadcrumbList>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbLink href="#">Home</GhostBreadcrumbLink>
        <GhostBreadcrumbSeparator />
      </GhostBreadcrumbItem>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbLink href="#">Projects</GhostBreadcrumbLink>
        <GhostBreadcrumbSeparator />
      </GhostBreadcrumbItem>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbPage>GhostVue</GhostBreadcrumbPage>
      </GhostBreadcrumbItem>
    </GhostBreadcrumbList>
  </GhostBreadcrumb>
</template>
