<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { GhostButton, useGhostToolbar } from '@ghostvue/vue'

const root = useTemplateRef<HTMLElement>('root')

const { rootProps } = useGhostToolbar({
  element: root,
  orientation: 'horizontal',
  label: 'Filters',
})
</script>

<template>
  <div ref="root" v-bind="rootProps" data-testid="toolbar-composable">
    <GhostButton type="button">All</GhostButton>
    <GhostButton type="button">Open</GhostButton>
    <GhostButton type="button">Closed</GhostButton>
  </div>
</template>