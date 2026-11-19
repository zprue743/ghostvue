<script setup lang="ts">
import { GhostInput } from '@ghostvue/themes'
</script>

<template>
  <div class="sizes">
    <label class="sizes__row">
      <span class="sizes__label">Small</span>
      <GhostInput size="sm" name="team" placeholder="Team name" block />
    </label>
    <label class="sizes__row">
      <span class="sizes__label">Medium</span>
      <GhostInput name="project" placeholder="Project name" block />
    </label>
    <label class="sizes__row">
      <span class="sizes__label">Large</span>
      <GhostInput
        size="lg"
        name="workspace"
        placeholder="Workspace name"
        block
      />
    </label>
  </div>
</template>

<style scoped>
/* A bounded stack: label above field on phones, aligned columns when wider. */
.sizes {
  display: grid;
  gap: var(--ghost-space-stack-lg);
  max-inline-size: 28rem;
}

.sizes__row {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}

.sizes__label {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

/* The docs preview is a `ghost-demo` container; elsewhere the stack stays. */
@container ghost-demo (min-width: 26rem) {
  .sizes__row {
    align-items: center;
    gap: var(--ghost-space-gap-md);
    grid-template-columns: 5rem minmax(0, 1fr);
  }
}
</style>
