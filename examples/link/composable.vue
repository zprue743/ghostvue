<script setup lang="ts">
import { computed } from 'vue'

import { useGhostLink } from '@ghostvue/vue'

const { rootProps } = useGhostLink({
  href: () => '/components/badge',
})

const hostProps = computed(() => rootProps.value)
</script>

<template>
  <a v-bind="hostProps">Composable badge docs</a>
</template>
