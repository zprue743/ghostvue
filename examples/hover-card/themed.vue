<script setup lang="ts">
import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostHoverCard,
  GhostHoverCardContent,
  GhostHoverCardTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <GhostCard class="release-note">
    <div class="release-note__line">
      <span>Published</span>
      <GhostHoverCard :open-delay="150" :close-delay="120">
        <GhostHoverCardTrigger
          :as="GhostButton"
          variant="soft"
          tone="accent"
          size="sm"
        >
          @ghostvue/themes
        </GhostHoverCardTrigger>
        <GhostHoverCardContent
          class="package-preview"
          placement="bottom-start"
          :offset="8"
        >
          <div class="package-preview__header">
            <span class="package-preview__avatar" aria-hidden="true">GV</span>
            <div class="package-preview__identity">
              <span class="package-preview__name">@ghostvue/themes</span>
              <span class="package-preview__handle">Design system layer</span>
            </div>
            <GhostBadge tone="accent" variant="soft">v0.4.0</GhostBadge>
          </div>
          <p class="package-preview__summary">
            Semantic DTCG tokens, elevation surfaces, and accessible component
            recipes for Vue 3.
          </p>
          <div class="package-preview__footer">
            <span class="package-preview__meta">
              Light &amp; dark · Density aware
            </span>
            <a class="package-preview__link" href="#api" @click.prevent>
              View package API
            </a>
          </div>
        </GhostHoverCardContent>
      </GhostHoverCard>
      <span>with updated elevation and portal token inheritance.</span>
    </div>
  </GhostCard>
</template>

<style scoped>
.release-note {
  inline-size: 100%;
  max-inline-size: 32rem;
}

.release-note__line {
  align-items: center;
  color: var(--ghost-surface-fg);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--ghost-type-size-sm);
  gap: var(--ghost-space-gap-xs);
  line-height: var(--ghost-type-line-normal);
}

.package-preview {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  inline-size: min(20rem, calc(100vw - 2rem));
}

.package-preview__header {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
}

.package-preview__avatar {
  align-items: center;
  background-color: var(--ghost-accent-soft-bg);
  border-radius: var(--ghost-radius-full);
  color: var(--ghost-accent-soft-fg);
  display: inline-flex;
  flex-shrink: 0;
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-semibold);
  block-size: 2rem;
  inline-size: 2rem;
  justify-content: center;
}

.package-preview__identity {
  display: grid;
  flex: 1;
  min-inline-size: 0;
}

.package-preview__name {
  color: var(--ghost-surface-fg);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-semibold);
}

.package-preview__handle {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}

.package-preview__summary {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.package-preview__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
  justify-content: space-between;
}

.package-preview__meta {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
}

.package-preview__link {
  border-radius: var(--ghost-radius-sm);
  color: var(--ghost-accent-text);
  font-size: var(--ghost-type-size-xs);
  font-weight: var(--ghost-type-weight-medium);
  text-decoration: none;
}

.package-preview__link:hover {
  text-decoration: underline;
}

.package-preview__link:focus-visible {
  outline: var(--ghost-focus-ring-width) solid var(--ghost-focus-ring-color);
  outline-offset: var(--ghost-focus-ring-offset);
}
</style>
