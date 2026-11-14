<script setup lang="ts">
import { useGhostEmptyState } from '@ghostvue/vue'

const { as, headingTag, titleId, rootProps } = useGhostEmptyState({
  as: 'section',
  headingLevel: 2,
  hasTitle: true,
})
</script>

<template>
  <component :is="as" v-bind="rootProps">
    <component :is="headingTag" :id="titleId" data-part="title">
      Custom host
    </component>
    <div data-part="description">Composable root bindings without the SFC.</div>
  </component>
</template>
