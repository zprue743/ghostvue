<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostButton,
  type GhostButtonSize,
  type GhostButtonTone,
  type GhostButtonVariant,
} from '@ghostvue/themes'

/*
 * Optional so the sample runs as-is; the docs props playground passes them
 * to try other treatments. The defaults are what this sample renders.
 */
const {
  size = 'md',
  tone = 'danger',
  variant = 'outline',
} = defineProps<{
  size?: GhostButtonSize
  tone?: GhostButtonTone
  variant?: GhostButtonVariant
}>()

const saving = ref(false)
</script>

<template>
  <GhostButton :variant :tone :size :loading="saving">Delete</GhostButton>
</template>
