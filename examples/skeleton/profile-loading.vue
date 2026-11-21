<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostAvatar,
  GhostBadge,
  GhostButton,
  GhostCard,
  GhostSkeleton,
} from '@ghostvue/themes'

const loading = ref(true)

function toggleState(): void {
  loading.value = !loading.value
}
</script>

<template>
  <div class="skeleton-showcase">
    <GhostCard>
      <template #header>
        <div class="skeleton-showcase__header">
          <span class="skeleton-showcase__title">Maintainer profile</span>
          <GhostButton
            size="sm"
            variant="outline"
            tone="neutral"
            @click="toggleState"
          >
            {{ loading ? 'Show loaded' : 'Show loading' }}
          </GhostButton>
        </div>
      </template>

      <div
        class="skeleton-showcase__region"
        :aria-busy="loading ? 'true' : undefined"
      >
        <template v-if="loading">
          <div class="skeleton-showcase__profile">
            <GhostSkeleton shape="circle" class="skeleton-showcase__avatar" />
            <div class="skeleton-showcase__lines">
              <GhostSkeleton class="skeleton-showcase__name-bone" />
              <GhostSkeleton class="skeleton-showcase__role-bone" />
            </div>
          </div>
          <GhostSkeleton shape="rect" class="skeleton-showcase__bio-bone" />
        </template>

        <template v-else>
          <div class="skeleton-showcase__profile">
            <GhostAvatar name="Ada Lovelace" size="md" />
            <div class="skeleton-showcase__identity">
              <div class="skeleton-showcase__name-row">
                <span class="skeleton-showcase__name">Ada Lovelace</span>
                <GhostBadge tone="accent" variant="soft" size="sm">
                  Core
                </GhostBadge>
              </div>
              <span class="skeleton-showcase__role">
                Design Systems · Tokens &amp; Accessibility
              </span>
            </div>
          </div>
          <span class="skeleton-showcase__bio">
            Maintains semantic color scales, density primitives, and headless
            component contracts across @ghostvue/vue and @ghostvue/themes.
          </span>
        </template>
      </div>
    </GhostCard>
  </div>
</template>

<style scoped>
.skeleton-showcase {
  display: grid;
}

.skeleton-showcase__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.skeleton-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.skeleton-showcase__region {
  display: grid;
  gap: var(--ghost-space-stack-sm);
}

.skeleton-showcase__profile {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
}

.skeleton-showcase__avatar {
  block-size: 2.5rem;
  flex-shrink: 0;
  inline-size: 2.5rem;
}

.skeleton-showcase__lines,
.skeleton-showcase__identity {
  display: grid;
  flex: 1;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.skeleton-showcase__name-bone {
  block-size: 1rem;
  inline-size: min(100%, 10rem);
}

.skeleton-showcase__role-bone {
  block-size: 0.75rem;
  inline-size: min(100%, 15rem);
}

.skeleton-showcase__bio-bone {
  block-size: 2.75rem;
  inline-size: 100%;
}

.skeleton-showcase__name-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.skeleton-showcase__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.skeleton-showcase__role {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

.skeleton-showcase__bio {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}
</style>
