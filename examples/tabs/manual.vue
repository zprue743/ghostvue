<script setup lang="ts">
import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <!-- Arrow keys only move focus; Enter, Space, or a click selects. -->
  <GhostTabs activation-mode="manual" default-value="drafts">
    <div class="tabs">
      <GhostTabsList aria-label="Mailboxes">
        <GhostTabsTrigger value="inbox">Inbox</GhostTabsTrigger>
        <GhostTabsTrigger value="drafts">Drafts</GhostTabsTrigger>
        <GhostTabsTrigger value="sent">Sent</GhostTabsTrigger>
      </GhostTabsList>
      <GhostTabsContent value="inbox">
        Unread messages arrive here.
      </GhostTabsContent>
      <GhostTabsContent value="drafts">
        Work-in-progress messages stay local.
      </GhostTabsContent>
      <GhostTabsContent value="sent">
        Messages you've already sent.
      </GhostTabsContent>
    </div>
  </GhostTabs>
</template>

<style scoped>
.tabs {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}
</style>
