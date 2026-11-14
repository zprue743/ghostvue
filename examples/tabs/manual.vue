<script setup lang="ts">
import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostTabs activation-mode="manual" default-value="drafts">
    <GhostTabsList>
      <GhostTabsTrigger value="inbox">Inbox</GhostTabsTrigger>
      <GhostTabsTrigger value="drafts">Drafts</GhostTabsTrigger>
      <GhostTabsTrigger value="sent">Sent</GhostTabsTrigger>
    </GhostTabsList>
    <GhostTabsContent value="inbox"
      >Unread messages arrive here.</GhostTabsContent
    >
    <GhostTabsContent value="drafts"
      >Work-in-progress messages stay local.</GhostTabsContent
    >
    <GhostTabsContent value="sent"
      >Messages you've already sent.</GhostTabsContent
    >
  </GhostTabs>
</template>
