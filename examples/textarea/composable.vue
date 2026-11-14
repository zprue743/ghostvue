<script setup lang="ts">
import { useGhostTextarea } from '@ghostvue/vue'

const { rootProps } = useGhostTextarea({ defaultValue: 'Composable host.' })
</script>

<template>
  <div>
    <label for="composable-notes">Notes</label>
    <textarea id="composable-notes" v-bind="rootProps" />
  </div>
</template>
