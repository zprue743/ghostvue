<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/vue'

const selected = ref('profile')
</script>

<template>
  <GhostTabs v-model="selected">
    <!-- GhostTabs renders no element; this block keeps the panel under the list. -->
    <div class="tabs">
      <GhostTabsList aria-label="Account settings">
        <GhostTabsTrigger value="profile">Profile</GhostTabsTrigger>
        <GhostTabsTrigger value="billing">Billing</GhostTabsTrigger>
        <GhostTabsTrigger value="security">Security</GhostTabsTrigger>
      </GhostTabsList>
      <GhostTabsContent value="profile">
        Manage your public profile and contact details.
      </GhostTabsContent>
      <GhostTabsContent value="billing">
        Review invoices and payment methods.
      </GhostTabsContent>
      <GhostTabsContent value="security">
        Rotate passwords and review active sessions.
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
