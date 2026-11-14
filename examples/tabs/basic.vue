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
    <GhostTabsList>
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
  </GhostTabs>
</template>
