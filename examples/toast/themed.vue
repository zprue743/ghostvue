<script setup lang="ts">
import { defineComponent, type SlotsType } from 'vue'

import {
  GhostButton,
  GhostToastProvider,
  GhostToastViewport,
  useGhostToast,
  type UseGhostToastReturn,
} from '@ghostvue/themes'

// In an app, any component under GhostToastProvider calls useGhostToast().
// This renderless child only hands that API to the template below.
const ToastApi = defineComponent({
  slots: Object as SlotsType<{
    default: (api: UseGhostToastReturn) => unknown
  }>,
  setup(_props, { slots }) {
    const api = useGhostToast()
    return () => slots.default(api)
  },
})

// One id for one piece of state: every sync attempt updates this toast
// instead of stacking a new one.
const SYNC_TOAST_ID = 'sync-status'
// Failed attempts for the current sync. Sync files resets it to the first.
let failedAttempts = 0

// Ordinary success: an informational toast. It is announced politely and
// dismisses itself after the provider's 8 seconds (paused on hover and focus).
function saveDraft({ toast }: UseGhostToastReturn) {
  toast({
    title: 'Draft saved',
    description: 'Your changes are stored in this workspace.',
  })
}

// Persistent error: type 'error' and an action both keep the toast until the
// user dismisses it, and the themed toast picks the danger tone.
function syncFiles(api: UseGhostToastReturn) {
  failedAttempts = 1
  api.toast({
    id: SYNC_TOAST_ID,
    type: 'error',
    title: 'Sync failed',
    description: 'Three files could not be uploaded.',
    action: {
      label: 'Retry',
      onClick: () => {
        retrySync(api)
      },
    },
  })
}

// Retry: this sample stays offline, so each retry updates the same toast in
// place. It keeps its position and the focused Retry button, does not replay
// the enter animation, and announceUpdate reads the new text once.
function retrySync({ update }: UseGhostToastReturn) {
  failedAttempts += 1
  update(SYNC_TOAST_ID, {
    title: 'Still failing',
    description: `Attempt ${String(failedAttempts)} failed. Check your connection and try again.`,
    announceUpdate: true,
  })
}
</script>

<template>
  <GhostToastProvider>
    <ToastApi v-slot="api">
      <div class="toast-themed-example">
        <GhostButton variant="outline" @click="saveDraft(api)">
          Save draft
        </GhostButton>
        <GhostButton tone="danger" variant="soft" @click="syncFiles(api)">
          Sync files
        </GhostButton>
      </div>
    </ToastApi>
    <!-- Default portal: the theme fixes the stack to the bottom-end corner
         and renders each record as a themed toast with an icon close. -->
    <GhostToastViewport />
  </GhostToastProvider>
</template>

<style scoped>
.toast-themed-example {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}
</style>
