<script setup lang="ts">
import {
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostSeparator,
} from '@ghostvue/themes'
</script>

<template>
  <div class="separator-showcase">
    <GhostCard>
      <div class="separator-showcase__header">
        <div class="separator-showcase__title-row">
          <span class="separator-showcase__title">@ghostvue/themes</span>
          <GhostBadge tone="accent" variant="soft" size="sm">
            Stable
          </GhostBadge>
        </div>

        <div class="separator-showcase__meta">
          <span>v2.14.0</span>
          <GhostSeparator orientation="vertical" decorative />
          <span>MIT License</span>
          <GhostSeparator orientation="vertical" decorative />
          <span>Updated 2h ago</span>
        </div>
      </div>

      <GhostSeparator class="separator-showcase__divider" />

      <div class="separator-showcase__actions">
        <div class="separator-showcase__group">
          <GhostButton size="sm" variant="outline" tone="neutral">
            Changelog
          </GhostButton>
          <GhostButton size="sm" variant="outline" tone="neutral">
            Compare diff
          </GhostButton>
        </div>
        <GhostSeparator
          orientation="vertical"
          class="separator-showcase__group-rule"
        />
        <div class="separator-showcase__group">
          <GhostButton size="sm">Promote release</GhostButton>
        </div>
      </div>
    </GhostCard>
  </div>
</template>

<style scoped>
.separator-showcase {
  display: grid;
}

.separator-showcase__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.separator-showcase__title-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}

.separator-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.separator-showcase__meta {
  align-items: stretch;
  color: var(--ghost-text-muted);
  display: flex;
  flex-wrap: wrap;
  font-size: var(--ghost-type-size-xs);
  gap: var(--ghost-space-gap-sm);
  line-height: var(--ghost-type-line-normal);
}

.separator-showcase__divider {
  margin-block: var(--ghost-space-stack-sm);
}

.separator-showcase__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}

.separator-showcase__group {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.separator-showcase__group-rule {
  display: none;
}

@container ghost-demo (min-width: 28rem) {
  .separator-showcase__actions {
    align-items: stretch;
  }

  .separator-showcase__group-rule {
    display: block;
  }
}
</style>
