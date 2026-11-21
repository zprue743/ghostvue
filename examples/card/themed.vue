<script setup lang="ts">
import { GhostCard } from '@ghostvue/themes'
</script>

<template>
  <div class="card-themed-example">
    <GhostCard interactive="spotlight" class="card-themed-example__card">
      <template #header>
        <h2 class="card-themed-example__title">Themed card</h2>
      </template>
      <span class="card-themed-example__copy">
        Default elevation and padding from <code>@ghostvue/themes</code>.
      </span>
      <template #footer>
        <span class="card-themed-example__footer">Footer slot</span>
      </template>
    </GhostCard>
  </div>
</template>

<style scoped>
.card-themed-example {
  display: grid;
}

.card-themed-example__card {
  max-inline-size: 24rem;
}

.card-themed-example__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.card-themed-example__copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

.card-themed-example__footer {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}
</style>
