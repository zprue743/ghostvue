<script setup lang="ts">
import {
  GhostButton,
  GhostDialog,
  GhostDialogClose,
  GhostDialogContent,
  GhostDialogDescription,
  GhostDialogOverlay,
  GhostDialogTitle,
  GhostDialogTrigger,
} from '@ghostvue/themes'

// Deterministic release notes, long enough to overflow a phone viewport.
const changes = [
  {
    title: 'Shared reports',
    body: 'Reports can be shared with a link that expires after 30 days. Owners can revoke a link at any time from the report menu.',
  },
  {
    title: 'Faster search',
    body: 'Workspace search now indexes comments and attachments, and returns the first results while the rest are still loading.',
  },
  {
    title: 'Keyboard shortcuts',
    body: 'Press ? anywhere to list every shortcut. Shortcuts follow your keyboard layout, including right-to-left layouts.',
  },
  {
    title: 'Audit log export',
    body: 'Admins can export up to 12 months of audit events as CSV. Large exports are prepared in the background and emailed when ready.',
  },
  {
    title: 'Retired: legacy embeds',
    body: 'Embeds created before version 3 stop rendering next month. Replace them with the new embed code from the share menu.',
  },
] as const
</script>

<template>
  <GhostDialog>
    <GhostDialogTrigger :as="GhostButton" variant="outline">
      What's new in 4.2
    </GhostDialogTrigger>
    <GhostDialogOverlay />
    <GhostDialogContent class="notes-dialog">
      <div class="notes-dialog__header">
        <GhostDialogTitle>What's new in 4.2</GhostDialogTitle>
        <GhostDialogDescription>
          Five changes since the last release. The dialog scrolls when the notes
          are taller than the viewport.
        </GhostDialogDescription>
      </div>
      <ul class="notes-dialog__list">
        <li v-for="change in changes" :key="change.title">
          <h3 class="notes-dialog__item-title">{{ change.title }}</h3>
          <p class="notes-dialog__item-body">{{ change.body }}</p>
        </li>
      </ul>
      <div class="notes-dialog__actions">
        <GhostDialogClose :as="GhostButton">Got it</GhostDialogClose>
      </div>
    </GhostDialogContent>
  </GhostDialog>
</template>

<style scoped>
.notes-dialog__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.notes-dialog__list {
  display: grid;
  gap: var(--ghost-space-stack-md);
  list-style: none;
  margin: 0;
  padding: 0;
}

.notes-dialog__item-title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-sm);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
}

.notes-dialog__item-body {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
  margin: 0;
}

.notes-dialog__actions {
  display: flex;
  justify-content: flex-end;
}
</style>
