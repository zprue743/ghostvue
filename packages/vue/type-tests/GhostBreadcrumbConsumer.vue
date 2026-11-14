<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostBreadcrumb,
  GhostBreadcrumbItem,
  GhostBreadcrumbLink,
  GhostBreadcrumbList,
  GhostBreadcrumbPage,
  GhostBreadcrumbSeparator,
  type GhostBreadcrumbLinkExposed,
} from '../src'

const link = ref<GhostBreadcrumbLinkExposed | null>(null)

function focusLink() {
  const exposed = link.value
  if (exposed) {
    exposed.focus()
  }
}
</script>

<template>
  <GhostBreadcrumb aria-label="Types">
    <GhostBreadcrumbList>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbLink ref="link" href="#" @click="focusLink">
          Home
        </GhostBreadcrumbLink>
        <GhostBreadcrumbSeparator />
      </GhostBreadcrumbItem>
      <GhostBreadcrumbItem>
        <GhostBreadcrumbPage>Current</GhostBreadcrumbPage>
      </GhostBreadcrumbItem>
    </GhostBreadcrumbList>
  </GhostBreadcrumb>
</template>
