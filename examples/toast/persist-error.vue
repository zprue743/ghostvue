<script setup lang="ts">
import { defineComponent, type SlotsType } from 'vue'

import {
  GhostButton,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogTitle,
  GhostDialogTrigger,
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

function publish({ toast, dismiss }: UseGhostToastReturn) {
  // A fixed id keeps one "publish status" toast: calling toast() again with
  // the same id updates it in place instead of stacking duplicates.
  toast({
    id: 'publish-status',
    type: 'error',
    urgency: 'urgent',
    title: 'Publish failed',
    description: 'The server did not respond. Nothing was published.',
    action: {
      label: 'Retry',
      onClick: () => {
        dismiss('publish-status')
        toast({ title: 'Published', description: 'Release notes are live.' })
      },
    },
  })
}
</script>

<template>
  <GhostToastProvider>
    <ToastApi v-slot="api">
      <GhostDialog>
        <GhostDialogTrigger>Edit release notes</GhostDialogTrigger>
        <GhostDialogContent>
          <GhostDialogTitle>Release notes</GhostDialogTitle>
          <GhostDialogDescription>
            Publishing fails in this example so the error toast shows above the
            open dialog.
          </GhostDialogDescription>
          <GhostButton type="button" @click="publish(api)">
            Publish
          </GhostButton>
          <GhostDialogClose>Close</GhostDialogClose>
        </GhostDialogContent>
      </GhostDialog>
    </ToastApi>
    <!-- Default portal: the stack stays a sibling of the dialog under <body>,
         so it is not made inert while the dialog is open. -->
    <GhostToastViewport class="toast-example-viewport" />
  </GhostToastProvider>
</template>

<!-- Not scoped: the viewport is teleported, outside this component's scope. -->
<style>
.toast-example-viewport {
  position: fixed;
  inset-block-end: 1rem;
  inset-inline-end: 1rem;
  z-index: 100;
  display: grid;
  gap: 0.5rem;
  max-inline-size: min(24rem, calc(100vw - 2rem));
}

.toast-example-viewport > [data-ghost-toast] {
  display: grid;
  gap: 0.25rem;
  padding: 0.75rem;
  border: 1px solid CanvasText;
  background: Canvas;
  color: CanvasText;
}
</style>
