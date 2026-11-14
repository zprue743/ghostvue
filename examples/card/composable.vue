<script setup lang="ts">
import { useGhostCard } from '@ghostvue/vue'

const { as, rootProps } = useGhostCard({ as: 'article' })
</script>

<template>
  <component :is="as" v-bind="rootProps">
    <div data-part="header">Custom host</div>
    <div data-part="content">Composable root bindings without the SFC.</div>
  </component>
</template>
