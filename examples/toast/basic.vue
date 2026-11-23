<script setup lang="ts">
import { defineComponent, type SlotsType } from 'vue'

import {
  GhostButton,
  GhostToastProvider,
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
</script>

<template>
  <GhostToastProvider>
    <div class="toast-example">
      <ToastApi v-slot="{ toast }">
        <GhostButton
          type="button"
          @click="
            toast({
              title: 'Draft saved',
              description: 'Your changes are stored in this workspace.',
            })
          "
        >
          Save draft
        </GhostButton>
      </ToastApi>
      <!-- Rendered in place so the stack shows in this preview; apps usually
           keep the default portal to document.body. -->
      <GhostToastViewport :portal="false" />
    </div>
  </GhostToastProvider>
</template>

<style scoped>
.toast-example {
  display: grid;
  gap: 0.75rem;
  justify-items: start;
}
</style>
