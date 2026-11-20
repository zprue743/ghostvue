<script setup lang="ts">
import { GhostCard, GhostLink, GhostSeparator } from '@ghostvue/themes'
</script>

<template>
  <div class="link-showcase">
    <GhostCard>
      <template #header>
        <span class="link-showcase__title">Documentation &amp; support</span>
      </template>

      <div class="link-showcase__grid">
        <div class="link-showcase__group">
          <span class="link-showcase__heading">Guides</span>
          <GhostLink href="#getting-started">Getting started</GhostLink>
          <GhostLink href="#theming" variant="subtle">
            Theme token reference
          </GhostLink>
          <GhostLink href="#migration" disabled>
            Legacy v1 migration (archived)
          </GhostLink>
        </div>

        <div class="link-showcase__group">
          <span class="link-showcase__heading">Specifications</span>
          <GhostLink href="https://www.w3.org/WAI/ARIA/apg/" target="_blank">
            WAI-ARIA Authoring Practices
          </GhostLink>
          <GhostLink href="https://vuejs.org/" external>
            Vue.js documentation
          </GhostLink>
        </div>
      </div>

      <GhostSeparator class="link-showcase__divider" />

      <span class="link-showcase__note">
        Read the
        <GhostLink href="#accessibility-contract">
          accessibility contract
        </GhostLink>
        before shipping custom wrappers.
      </span>
    </GhostCard>
  </div>
</template>

<style scoped>
.link-showcase {
  display: grid;
}

.link-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.link-showcase__grid {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.link-showcase__group {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: var(--ghost-space-gap-xs);
}

.link-showcase__heading {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.link-showcase__divider {
  margin-block: var(--ghost-space-stack-sm);
}

.link-showcase__note {
  color: var(--ghost-text-muted);
  display: block;
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 28rem) {
  .link-showcase__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
