<script setup lang="ts">
import {
  GhostBreadcrumb,
  GhostBreadcrumbEllipsis,
  GhostBreadcrumbItem,
  GhostBreadcrumbLink,
  GhostBreadcrumbList,
  GhostBreadcrumbPage,
  GhostBreadcrumbSeparator,
} from '@ghostvue/themes'
</script>

<template>
  <GhostBreadcrumb aria-label="Settings trail">
    <GhostBreadcrumbList>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbLink href="#">Home</GhostBreadcrumbLink>
        <GhostBreadcrumbSeparator />
      </GhostBreadcrumbItem>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbEllipsis label="Show hidden segments">
          <GhostBreadcrumbLink href="#">Products</GhostBreadcrumbLink>
          <GhostBreadcrumbLink href="#">Catalog</GhostBreadcrumbLink>
          <GhostBreadcrumbLink href="#">Releases</GhostBreadcrumbLink>
        </GhostBreadcrumbEllipsis>
        <GhostBreadcrumbSeparator />
      </GhostBreadcrumbItem>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbLink href="#">Components</GhostBreadcrumbLink>
        <GhostBreadcrumbSeparator />
      </GhostBreadcrumbItem>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbPage>Breadcrumb</GhostBreadcrumbPage>
      </GhostBreadcrumbItem>
    </GhostBreadcrumbList>
  </GhostBreadcrumb>
</template>
