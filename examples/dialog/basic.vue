<script setup lang="ts">
import {
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostDialog>
    <GhostDialogTrigger>Open dialog</GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent>
      <GhostDialogTitle>Account settings</GhostDialogTitle>
      <GhostDialogDescription>
        Update how session notifications appear while working.
      </GhostDialogDescription>
      <GhostDialogClose>Close</GhostDialogClose>
    </GhostDialogContent>
  </GhostDialog>
</template>
