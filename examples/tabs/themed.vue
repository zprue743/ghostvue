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
      GhostTabs renders no element, so this wrapper keeps the strip and the
      panel in one block: the panel always sits below the list instead of
      flowing beside it inside a flex or grid parent.
    -->
    <div>
      <GhostTabsList>
        <GhostTabsTrigger value="overview">Overview</GhostTabsTrigger>
        <GhostTabsTrigger value="members">Members</GhostTabsTrigger>
        <GhostTabsTrigger value="audit">Audit log</GhostTabsTrigger>
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
    </div>
  </GhostTabs>
</template>
