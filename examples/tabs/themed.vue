<script setup lang="ts">
import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <GhostTabs default-value="overview">
    <!--
      GhostTabs renders no element, so this block keeps the strip and the
      panel in one stack: the panel always sits below the list instead of
      flowing beside it inside a flex or grid parent.
    -->
    <div class="tabs">
      <GhostTabsList aria-label="Project">
        <GhostTabsTrigger value="overview">Overview</GhostTabsTrigger>
        <GhostTabsTrigger value="members">Members</GhostTabsTrigger>
        <GhostTabsTrigger value="audit">Audit log</GhostTabsTrigger>
        <GhostTabsTrigger value="exports" disabled>Exports</GhostTabsTrigger>
      </GhostTabsList>
      <GhostTabsContent value="overview">
        Workspace summary and usage snapshots.
      </GhostTabsContent>
      <GhostTabsContent value="members">
        Invite collaborators and manage roles.
      </GhostTabsContent>
      <GhostTabsContent value="audit">
        Review sign-in events from the past 30 days.
      </GhostTabsContent>
      <GhostTabsContent value="exports">
        Download workspace data as CSV.
      </GhostTabsContent>
    </div>
  </GhostTabs>
</template>

<style scoped>
.tabs {
  display: grid;
  max-inline-size: 36rem;
}
</style>
