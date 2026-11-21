<script setup lang="ts">
import {
  GhostAvatar,
  GhostBadge,
  GhostButton,
  GhostCard,
} from '@ghostvue/themes'
</script>

<template>
  <div class="card-showcase">
    <GhostCard>
      <template #header>
        <div class="card-showcase__header">
          <div class="card-showcase__identity">
            <GhostAvatar name="Northwind Web" size="sm" />
            <div class="card-showcase__titles">
              <span class="card-showcase__title">Northwind Web</span>
              <span class="card-showcase__subtitle">
                Production · us-west-2
              </span>
            </div>
          </div>
          <GhostBadge tone="accent" variant="soft" size="sm">
            Healthy
          </GhostBadge>
        </div>
      </template>

      <span class="card-showcase__body">
        Latest build passed all 48 integration checks. Edge cache warming is
        active across 12 regions.
      </span>

      <template #footer>
        <div class="card-showcase__footer">
          <GhostButton size="sm" variant="outline" tone="neutral">
            View logs
          </GhostButton>
          <GhostButton size="sm">Deploy</GhostButton>
        </div>
      </template>
    </GhostCard>

    <GhostCard as="a" href="#deployment-guide" interactive="spotlight">
      <template #header>
        <div class="card-showcase__header">
          <span class="card-showcase__title">Deployment runbook</span>
          <GhostBadge tone="neutral" variant="outline" size="sm">
            Guide
          </GhostBadge>
        </div>
      </template>

      <span class="card-showcase__body">
        Review rollback thresholds, canary weights, and regional drain steps
        before promoting a release.
      </span>

      <template #footer>
        <span class="card-showcase__link-hint">Read runbook →</span>
      </template>
    </GhostCard>
  </div>
</template>

<style scoped>
.card-showcase {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.card-showcase__header {
  align-items: start;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.card-showcase__identity {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  min-inline-size: 0;
}

.card-showcase__titles {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
  min-inline-size: 0;
}

.card-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.card-showcase__subtitle {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

.card-showcase__body {
  color: var(--ghost-text-muted);
  display: block;
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

.card-showcase__footer {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
  justify-content: flex-end;
}

.card-showcase__link-hint {
  color: var(--ghost-accent-text);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 34rem) {
  .card-showcase {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
