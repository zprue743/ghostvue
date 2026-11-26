<script setup>
import { GhostButton, useGhostToast } from '@ghostvue/themes'

const { toast } = useGhostToast()
</script>

<template>
  <GhostButton
    data-smoke="toast-trigger"
    @click="toast({ title: 'Draft saved' })"
  >
    Save draft
  </GhostButton>
</template>
