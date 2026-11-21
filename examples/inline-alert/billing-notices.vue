<script setup lang="ts">
import { ref } from 'vue'

import { GhostButton, GhostCard, GhostInlineAlert } from '@ghostvue/themes'

const showQuotaNotice = ref(true)
const status = ref('')

function retryCharge(): void {
  status.value = 'Payment retry queued.'
}

function dismissQuota(): void {
  showQuotaNotice.value = false
  status.value = 'Usage notice dismissed.'
}

function restoreNotices(): void {
  showQuotaNotice.value = true
  status.value = 'Notices restored.'
}
</script>

<template>
  <section class="notices" aria-labelledby="notices-title">
    <GhostCard>
      <template #header>
        <div class="notices__header">
          <h2 id="notices-title" class="notices__title">
            Workspace billing status
          </h2>
          <p class="notices__lead">
            Contextual notices sit inline with the billing controls they affect.
          </p>
        </div>
      </template>

      <div class="notices__stack">
        <GhostInlineAlert variant="solid" tone="danger" announce="alert">
          <template #title>Payment method declined</template>
          <template #message>
            The card ending in 4242 failed authorization. Update billing details
            before Friday to avoid pausing background workers.
          </template>
          <template #actions>
            <GhostButton size="sm" variant="outline" @click="retryCharge">
              Retry charge
            </GhostButton>
          </template>
        </GhostInlineAlert>

        <GhostInlineAlert variant="soft" tone="accent">
          <template #title>Annual invoice scheduled</template>
          <template #message>
            Your Pro renewal ($348.00) is scheduled for December 1, 2026.
          </template>
        </GhostInlineAlert>

        <GhostInlineAlert
          v-if="showQuotaNotice"
          variant="outline"
          tone="neutral"
        >
          <template #title>Storage at 82% of included quota</template>
          <template #message>
            Artifact retention is set to 30 days. Adjust retention in workspace
            settings if you need more headroom.
          </template>
          <template #actions>
            <GhostButton
              size="sm"
              variant="ghost"
              tone="neutral"
              @click="dismissQuota"
            >
              Dismiss
            </GhostButton>
          </template>
        </GhostInlineAlert>
      </div>

      <template #footer>
        <div class="notices__footer">
          <p class="notices__status" role="status">{{ status }}</p>
          <GhostButton
            v-if="!showQuotaNotice"
            size="sm"
            variant="ghost"
            tone="neutral"
            @click="restoreNotices"
          >
            Restore dismissed
          </GhostButton>
        </div>
      </template>
    </GhostCard>
  </section>
</template>

<style scoped>
.notices {
  max-inline-size: 38rem;
}

.notices__header {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  padding-block-end: var(--ghost-space-stack-sm);
}

.notices__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-lg);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-tight);
  margin: 0;
}

.notices__lead,
.notices__status {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-snug);
  margin: 0;
  overflow-wrap: anywhere;
}

.notices__stack {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.notices__footer {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
  justify-content: space-between;
  min-block-size: var(--ghost-control-size-sm-min);
}
</style>
