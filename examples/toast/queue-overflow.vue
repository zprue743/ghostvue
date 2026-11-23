<script setup lang="ts">
import { defineComponent, type SlotsType } from 'vue'

import {
  GhostButton,
  GhostToast,
  GhostToastClose,
  GhostToastDescription,
  GhostToastProvider,
  GhostToastTitle,
  GhostToastViewport,
  useGhostToast,
  type UseGhostToastReturn,
} from '@ghostvue/vue'

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

const builds = ['api', 'docs', 'web', 'worker', 'mobile']

function sendAll({ toast }: UseGhostToastReturn) {
  for (const build of builds) {
    // duration: null persists, so the waiting toasts appear only as visible
    // ones are dismissed.
    toast({
      title: `Build ${build} finished`,
      description: 'All checks passed.',
      duration: null,
    })
  }
}
</script>

<template>
  <GhostToastProvider :limit="3">
    <div class="toast-example">
      <ToastApi v-slot="api">
        <div class="toast-example__actions">
          <GhostButton type="button" @click="sendAll(api)">
            Finish five builds
          </GhostButton>
          <GhostButton type="button" @click="api.dismissAll()">
            Dismiss all
          </GhostButton>
        </div>
      </ToastApi>
      <GhostToastViewport :portal="false" as="section">
        <template #toast="{ toast }">
          <GhostToast :toast="toast" class="toast-example__toast">
            <GhostToastTitle>{{ toast.title }}</GhostToastTitle>
            <GhostToastDescription>{{
              toast.description
            }}</GhostToastDescription>
            <GhostToastClose :aria-label="`Dismiss: ${toast.title}`">
              Dismiss
            </GhostToastClose>
          </GhostToast>
        </template>
      </GhostToastViewport>
    </div>
  </GhostToastProvider>
</template>

<style scoped>
.toast-example {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}

.toast-example__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.toast-example__toast {
  border-block-end: 1px solid currentcolor;
  padding-block: 0.5rem;
}
</style>
