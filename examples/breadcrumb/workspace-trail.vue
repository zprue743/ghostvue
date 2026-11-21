<script setup lang="ts">
import {
  GhostBadge,
  GhostBreadcrumb,
  GhostBreadcrumbEllipsis,
  GhostBreadcrumbItem,
  GhostBreadcrumbLink,
  GhostBreadcrumbList,
  GhostBreadcrumbPage,
  GhostBreadcrumbSeparator,
  GhostCard,
} from '@ghostvue/themes'
</script>

<template>
  <div class="breadcrumb-showcase">
    <GhostCard>
      <div class="breadcrumb-showcase__body">
        <GhostBreadcrumb aria-label="Project location">
          <GhostBreadcrumbList>
            <GhostBreadcrumbItem>
              <GhostBreadcrumbLink href="#workspace">
                Northwind
              </GhostBreadcrumbLink>
              <GhostBreadcrumbSeparator />
            </GhostBreadcrumbItem>
            <GhostBreadcrumbItem>
              <GhostBreadcrumbEllipsis label="Show parent folders">
                <GhostBreadcrumbLink href="#engineering">
                  Engineering
                </GhostBreadcrumbLink>
                <GhostBreadcrumbLink href="#design-systems">
                  Design Systems
                </GhostBreadcrumbLink>
                <GhostBreadcrumbLink href="#tokens">
                  Tokens
                </GhostBreadcrumbLink>
              </GhostBreadcrumbEllipsis>
              <GhostBreadcrumbSeparator />
            </GhostBreadcrumbItem>
            <GhostBreadcrumbItem>
              <GhostBreadcrumbLink href="#releases">
                Releases
              </GhostBreadcrumbLink>
              <GhostBreadcrumbSeparator />
            </GhostBreadcrumbItem>
            <GhostBreadcrumbItem>
              <GhostBreadcrumbPage>v2.14.0</GhostBreadcrumbPage>
            </GhostBreadcrumbItem>
          </GhostBreadcrumbList>
        </GhostBreadcrumb>

        <div class="breadcrumb-showcase__header">
          <span class="breadcrumb-showcase__title">
            Tokens v2.14.0 release notes
          </span>
          <GhostBadge tone="accent" variant="soft" size="sm">
            Published
          </GhostBadge>
        </div>
      </div>
    </GhostCard>
  </div>
</template>

<style scoped>
.breadcrumb-showcase {
  display: grid;
}

.breadcrumb-showcase__body {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.breadcrumb-showcase__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.breadcrumb-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}
</style>
