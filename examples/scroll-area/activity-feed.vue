<script setup lang="ts">
import {
  GhostAvatar,
  GhostBadge,
  GhostCard,
  GhostScrollArea,
} from '@ghostvue/themes'

const events = [
  {
    id: 'evt-1',
    actor: 'Ada Lovelace',
    summary: 'Published @ghostvue/themes v2.14.0',
    time: '10:42',
    tone: 'accent' as const,
    tag: 'Release',
  },
  {
    id: 'evt-2',
    actor: 'Grace Hopper',
    summary: 'Updated contrast tokens for dark surface elevation',
    time: '10:18',
    tone: 'neutral' as const,
    tag: 'Tokens',
  },
  {
    id: 'evt-3',
    actor: 'Alan Turing',
    summary: 'Verified Linux visual baselines across 17 showcases',
    time: '09:54',
    tone: 'neutral' as const,
    tag: 'QA',
  },
  {
    id: 'evt-4',
    actor: 'Katherine Johnson',
    summary: 'Rotated staging deploy key for us-west-2',
    time: '09:12',
    tone: 'danger' as const,
    tag: 'Security',
  },
  {
    id: 'evt-5',
    actor: 'Margaret Hamilton',
    summary: 'Enabled automatic rollback guard on canary cluster',
    time: '08:40',
    tone: 'accent' as const,
    tag: 'Infra',
  },
  {
    id: 'evt-6',
    actor: 'Barbara Liskov',
    summary: 'Archived legacy icon sprite pipeline',
    time: '08:05',
    tone: 'neutral' as const,
    tag: 'Cleanup',
  },
] as const
</script>

<template>
  <div class="activity-feed">
    <GhostCard>
      <template #header>
        <div class="activity-feed__header">
          <span class="activity-feed__title">Workspace activity</span>
          <GhostBadge tone="neutral" variant="outline" size="sm">
            {{ events.length }} events
          </GhostBadge>
        </div>
      </template>

      <GhostScrollArea
        label="Recent workspace events"
        class="activity-feed__scroll"
      >
        <ul class="activity-feed__list">
          <li
            v-for="event in events"
            :key="event.id"
            class="activity-feed__row"
          >
            <GhostAvatar :name="event.actor" size="sm" />
            <div class="activity-feed__content">
              <span class="activity-feed__actor">{{ event.actor }}</span>
              <span class="activity-feed__summary">{{ event.summary }}</span>
            </div>
            <div class="activity-feed__meta">
              <GhostBadge :tone="event.tone" variant="soft" size="sm">
                {{ event.tag }}
              </GhostBadge>
              <span class="activity-feed__time">{{ event.time }}</span>
            </div>
          </li>
        </ul>
      </GhostScrollArea>
    </GhostCard>
  </div>
</template>

<style scoped>
.activity-feed {
  display: grid;
}

.activity-feed__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.activity-feed__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.activity-feed__scroll {
  max-block-size: 13rem;
  padding-inline-end: var(--ghost-space-gap-xs);
}

.activity-feed__list {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.activity-feed__row {
  align-items: start;
  display: grid;
  gap: var(--ghost-space-gap-sm);
  grid-template-columns: auto minmax(0, 1fr);
}

.activity-feed__content {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
  min-inline-size: 0;
}

.activity-feed__actor {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.activity-feed__summary {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

.activity-feed__meta {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-xs);
  grid-column: 2;
}

.activity-feed__time {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  font-variant-numeric: tabular-nums;
}

@container ghost-demo (min-width: 28rem) {
  .activity-feed__row {
    align-items: center;
    grid-template-columns: auto minmax(0, 1fr) auto;
  }

  .activity-feed__meta {
    grid-column: auto;
  }
}
</style>
