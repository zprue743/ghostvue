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

function syncFailed({ toast, update }: UseGhostToastReturn) {
  // type: 'error' persists and picks the danger tone. Retry updates the same
  // id in place, so the toast keeps its slot and does not animate again.
  toast({
    id: 'sync-status',
    type: 'error',
    title: 'Sync failed',
    description: 'Three files could not be uploaded.',
    action: {
      label: 'Retry',
      onClick: () => {
        update('sync-status', {
          title: 'Still failing',
          description: 'Retried once. Check your connection and try again.',
          announceUpdate: true,
        })
      },
    },
  })
}
</script>

<template>
  <GhostToastProvider>
    <ToastApi v-slot="api">
      <div class="toast-themed-example">
        <GhostButton
          variant="outline"
          @click="
            api.toast({
              title: 'Draft saved',
              description: 'Your changes are stored in this workspace.',
            })
          "
        >
          Save draft
        </GhostButton>
        <GhostButton tone="danger" variant="soft" @click="syncFailed(api)">
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
