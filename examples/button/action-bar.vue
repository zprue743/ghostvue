<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'

import { GhostButton, type GhostButtonSize } from '@ghostvue/themes'

/*
 * Optional so the sample runs as-is; the docs props playground passes them.
 * `size` applies to every action so the row keeps one rhythm. `loading`
 * shows the publish action as pending, the same state a click produces.
 */
const { size = 'md', loading } = defineProps<{
  size?: GhostButtonSize
  loading?: boolean
}>()

const publishing = ref(false)
const status = ref('Draft saved at 10:42')
let publishTimer: ReturnType<typeof setTimeout> | undefined

function saveDraft(): void {
  status.value = 'Draft saved at 10:43'
}

function discardDraft(): void {
  status.value = 'Changes discarded'
}

// Stands in for a request. The app owns the pending state and the result.
function publish(): void {
  publishing.value = true
  status.value = 'Publishing to 3 channels…'
  publishTimer = setTimeout(() => {
    publishing.value = false
    status.value = 'Published to 3 channels'
  }, 1500)
}

onBeforeUnmount(() => {
  clearTimeout(publishTimer)
})
</script>

<template>
  <div class="publish-bar">
    <div class="publish-bar__summary">
      <span class="publish-bar__title">Quarterly product update</span>
      <!-- Announces save, discard, and publish results politely. -->
      <span class="publish-bar__status" role="status">{{ status }}</span>
    </div>
    <div class="publish-bar__actions">
      <div class="publish-bar__discard">
        <GhostButton variant="ghost" tone="danger" :size @click="discardDraft">
          Discard changes
        </GhostButton>
      </div>
      <div class="publish-bar__commit">
        <GhostButton variant="outline" tone="neutral" :size @click="saveDraft">
          Save draft
        </GhostButton>
        <GhostButton :size :loading="loading || publishing" @click="publish">
          Publish
        </GhostButton>
      </div>
    </div>
  </div>
</template>

<style scoped>
/*
 * The summary sits above the actions. The destructive action lives in its
 * own group at the start so it is never the button next to the primary.
 * Narrow previews stack the groups and give Save and Publish equal halves;
 * wider ones put the groups on one row at opposite ends.
 */
.publish-bar {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.publish-bar__summary {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.publish-bar__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.publish-bar__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

.publish-bar__actions {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

/* Save and Publish split the row evenly on narrow previews. */
.publish-bar__commit {
  display: grid;
  gap: var(--ghost-space-gap-sm);
  grid-template-columns: 1fr 1fr;
}

@container ghost-demo (min-width: 26rem) {
  .publish-bar__actions {
    align-items: center;
    display: flex;
    flex-wrap: wrap;
    justify-content: space-between;
  }

  .publish-bar__commit {
    display: flex;
    flex-wrap: wrap;
  }
}
</style>
