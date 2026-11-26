<script setup lang="ts">
import { GhostLink } from '@ghostvue/themes'
</script>

<template>
  <div class="link-button-example">
    <div class="link-button-example__row">
      <GhostLink href="/getting-started" appearance="button" size="lg">
        Get started
      </GhostLink>
      <GhostLink
        href="/components/"
        appearance="button"
        variant="outline"
        size="lg"
      >
        Browse components
      </GhostLink>
      <GhostLink href="/philosophy" appearance="button" variant="soft">
        Why GhostVue
      </GhostLink>
      <GhostLink
        href="/architecture/overview"
        appearance="button"
        variant="ghost"
        tone="neutral"
        size="sm"
      >
        Architecture
      </GhostLink>
    </div>

    <div class="link-button-example__row">
      <GhostLink
        href="https://www.w3.org/WAI/ARIA/apg/patterns/link/"
        target="_blank"
        appearance="button"
        variant="outline"
      >
        WAI-ARIA link pattern
      </GhostLink>
      <GhostLink href="/deprecated" appearance="button" tone="danger" disabled>
        Unavailable destination
      </GhostLink>
    </div>
  </div>
</template>

<style scoped>
.link-button-example {
  display: flex;
  flex-direction: column;
  gap: var(--ghost-space-gap-md);
}

.link-button-example__row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}
</style>
