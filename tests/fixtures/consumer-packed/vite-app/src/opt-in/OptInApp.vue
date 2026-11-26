<script setup>
import { ref } from 'vue'

import {
  GhostButton,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostInput,
} from '@ghostvue/themes/components'

const workspace = ref('Ada')
</script>

<!-- The calm palette host is <html> (opt-in.html), so the dialog overlay and
     content that teleport to <body> still get its tokens. -->
<template>
  <main>
    <GhostField>
      <GhostFieldLabel>Workspace name</GhostFieldLabel>
      <GhostFieldControl v-slot="field">
        <GhostInput
          v-bind="field"
          v-model="workspace"
          name="workspace"
          data-smoke="input"
        />
      </GhostFieldControl>
    </GhostField>
    <GhostButton data-smoke="save">Save</GhostButton>

    <GhostDialog>
      <GhostDialogTrigger :as="GhostButton" data-smoke="dialog-trigger"
        >Open dialog</GhostDialogTrigger
      >
      <GhostDialogOverlay />
      <GhostDialogContent>
        <GhostDialogTitle>Smoke dialog</GhostDialogTitle>
        <GhostDialogDescription
          >Portaled outside the app root.</GhostDialogDescription
        >
        <GhostDialogClose :as="GhostButton" data-smoke="dialog-close"
          >Close</GhostDialogClose
        >
      </GhostDialogContent>
    </GhostDialog>
  </main>
</template>
