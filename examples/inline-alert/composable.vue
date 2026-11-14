<script setup lang="ts">
import { useGhostInlineAlert } from '@ghostvue/vue'

const { as, headingTag, titleId, rootProps } = useGhostInlineAlert({
  as: 'section',
  announce: 'off',
  hasTitle: true,
  headingLevel: 2,
})
</script>

<template>
  <component :is="as" v-bind="rootProps">
    <component :is="headingTag" :id="titleId" data-part="title">
      Recoverable warning
    </component>
    <div data-part="message">Some rows were skipped during import.</div>
  </component>
</template>
