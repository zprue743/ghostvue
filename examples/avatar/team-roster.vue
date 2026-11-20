<script setup lang="ts">
import { GhostAvatar, GhostBadge, GhostCard } from '@ghostvue/themes'

const members = [
  {
    name: 'Ada Lovelace',
    role: 'Design Systems',
    badge: 'Owner',
    tone: 'accent' as const,
  },
  {
    name: 'Grace Hopper',
    role: 'Platform Infrastructure',
    badge: 'Maintainer',
    tone: 'neutral' as const,
  },
  {
    name: 'Alan Turing',
    role: 'Accessibility QA',
    badge: 'Reviewer',
    tone: 'neutral' as const,
  },
] as const
</script>

<template>
  <div class="avatar-roster">
    <GhostCard>
      <template #header>
        <div class="avatar-roster__header">
          <span class="avatar-roster__title">Core maintainers</span>
          <GhostBadge tone="neutral" variant="outline" size="sm">
            {{ members.length }} members
          </GhostBadge>
        </div>
      </template>

      <ul class="avatar-roster__list">
        <li
          v-for="member in members"
          :key="member.name"
          class="avatar-roster__row"
        >
          <div class="avatar-roster__person">
            <GhostAvatar :name="member.name" size="md" />
            <div class="avatar-roster__meta">
              <span class="avatar-roster__name">{{ member.name }}</span>
              <span class="avatar-roster__role">{{ member.role }}</span>
            </div>
          </div>
          <GhostBadge :tone="member.tone" variant="soft" size="sm">
            {{ member.badge }}
          </GhostBadge>
        </li>
      </ul>
    </GhostCard>
  </div>
</template>

<style scoped>
.avatar-roster {
  display: grid;
}

.avatar-roster__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
}

.avatar-roster__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.avatar-roster__list {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  list-style: none;
  margin: 0;
  padding: 0;
}

.avatar-roster__row {
  align-items: start;
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.avatar-roster__person {
  align-items: center;
  display: flex;
  gap: var(--ghost-space-gap-sm);
  min-inline-size: 0;
}

.avatar-roster__meta {
  display: grid;
  gap: var(--ghost-space-gap-2xs);
  min-inline-size: 0;
}

.avatar-roster__name {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-medium);
  line-height: var(--ghost-type-line-snug);
}

.avatar-roster__role {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-xs);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 24rem) {
  .avatar-roster__row {
    align-items: center;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
