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
  GhostDrawer,
  GhostDrawerContent,
  GhostDrawerDescription,
  GhostDrawerOverlay,
  GhostDrawerTitle,
  GhostDrawerTrigger,
  GhostField,
  GhostFieldControl,
  GhostFieldLabel,
  GhostInput,
  GhostSelect,
  GhostSelectContent,
  GhostSelectOption,
  GhostSelectTrigger,
  GhostSelectValue,
  GhostToastProvider,
  GhostToastViewport,
} from '@ghostvue/themes'

import ToastButton from './ToastButton.vue'

const workspace = ref('Ada')
const region = ref('eu')
</script>

<template>
  <GhostToastProvider>
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

      <GhostSelect v-model="region" placeholder="Region">
        <GhostSelectTrigger aria-label="Region" data-smoke="select-trigger">
          <GhostSelectValue />
        </GhostSelectTrigger>
        <GhostSelectContent>
          <GhostSelectOption value="eu">Europe</GhostSelectOption>
          <GhostSelectOption value="us">United States</GhostSelectOption>
        </GhostSelectContent>
      </GhostSelect>

      <GhostDialog>
        <GhostDialogTrigger :as="GhostButton" data-smoke="dialog-trigger"
          >Open dialog</GhostDialogTrigger
        >
        <GhostDialogOverlay />
        <GhostDialogContent>
          <GhostDialogTitle>Smoke dialog</GhostDialogTitle>
          <GhostDialogDescription
            >Mounted from packed tarballs.</GhostDialogDescription
          >
          <GhostDialogClose :as="GhostButton" data-smoke="dialog-close"
            >Close</GhostDialogClose
          >
        </GhostDialogContent>
      </GhostDialog>

      <GhostDrawer>
        <GhostDrawerTrigger :as="GhostButton" data-smoke="drawer-trigger"
          >Open drawer</GhostDrawerTrigger
        >
        <GhostDrawerOverlay />
        <GhostDrawerContent>
          <GhostDrawerTitle>Smoke drawer</GhostDrawerTitle>
          <GhostDrawerDescription
            >Also mounted from packed tarballs.</GhostDrawerDescription
          >
        </GhostDrawerContent>
      </GhostDrawer>

      <ToastButton />
    </main>
    <GhostToastViewport />
  </GhostToastProvider>
</template>
