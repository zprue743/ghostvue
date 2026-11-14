<script setup lang="ts">
import { useGhostSeparator } from '@ghostvue/vue'

const { as, rootProps } = useGhostSeparator()
</script>

<template>
  <section>
    <p>Profile</p>
    <component :is="as" v-bind="rootProps" />
    <p>Billing</p>
  </section>
</template>
