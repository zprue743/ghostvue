<script setup lang="ts">
import { useTemplateRef } from 'vue'

import { useGhostInteractiveSurface } from '@ghostvue/vue'

const host = useTemplateRef<HTMLElement>('host')
const { rootProps } = useGhostInteractiveSurface(host)
</script>

<template>
  <article ref="host" class="report-card" v-bind="rootProps">
    <span data-part="glow" aria-hidden="true" />
    <p class="report-card__title">Quarterly report</p>
    <p class="report-card__copy">Move the pointer across this card.</p>
  </article>
</template>

<style scoped>
.report-card {
  min-block-size: 8rem;
  padding: var(--ghost-space-inset-md, 1.25rem);
  position: relative;
}

.report-card__title,
.report-card__copy {
  margin: 0;
}

.report-card__title {
  font-size: 1.15rem;
  font-weight: 650;
}
</style>
