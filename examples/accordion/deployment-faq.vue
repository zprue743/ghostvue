<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
  GhostBadge,
  GhostButton,
} from '@ghostvue/themes'

const openSections = ref<string[]>(['rollbacks'])

function expandAll(): void {
  openSections.value = ['rollbacks', 'regions', 'retention']
}

function collapseAll(): void {
  openSections.value = []
}
</script>

<template>
  <div class="faq-showcase">
    <div class="faq-showcase__header">
      <div class="faq-showcase__heading">
        <div class="faq-showcase__title-row">
          <span class="faq-showcase__title">Production release policy</span>
          <GhostBadge tone="neutral" variant="outline" size="sm">
            3 sections
          </GhostBadge>
        </div>
        <span class="faq-showcase__subtitle">
          Standard operating procedures for rollbacks, regions, and audit logs.
        </span>
      </div>
      <div class="faq-showcase__controls">
        <GhostButton
          size="sm"
          variant="outline"
          tone="neutral"
          @click="expandAll"
        >
          Expand all
        </GhostButton>
        <GhostButton
          size="sm"
          variant="ghost"
          tone="neutral"
          @click="collapseAll"
        >
          Collapse all
        </GhostButton>
      </div>
    </div>

    <GhostAccordion
      v-model="openSections"
      type="multiple"
      :heading-level="2"
      class="faq-showcase__accordion"
    >
      <GhostAccordionItem value="rollbacks">
        <GhostAccordionTrigger>
          Zero-downtime rollback window
        </GhostAccordionTrigger>
        <GhostAccordionContent>
          <div class="faq-showcase__panel">
            <span class="faq-showcase__copy">
              Previous container digests remain pinned for 72 hours after
              promotion so traffic shifts back in under 15 seconds.
            </span>
          </div>
        </GhostAccordionContent>
      </GhostAccordionItem>

      <GhostAccordionItem value="regions">
        <GhostAccordionTrigger>
          Regional failover sequencing
        </GhostAccordionTrigger>
        <GhostAccordionContent>
          <div class="faq-showcase__panel">
            <span class="faq-showcase__copy">
              Primary edges drain before standby clusters accept writes, keeping
              session tokens consistent across zones.
            </span>
          </div>
        </GhostAccordionContent>
      </GhostAccordionItem>

      <GhostAccordionItem value="retention">
        <GhostAccordionTrigger>
          Audit log retention &amp; export
        </GhostAccordionTrigger>
        <GhostAccordionContent>
          <div class="faq-showcase__panel">
            <span class="faq-showcase__copy">
              Operator attestations and deployment diffs are retained for 365
              days and exported nightly to cold storage.
            </span>
          </div>
        </GhostAccordionContent>
      </GhostAccordionItem>
    </GhostAccordion>
  </div>
</template>

<style scoped>
.faq-showcase {
  display: grid;
  gap: var(--ghost-space-stack-md);
}

.faq-showcase__header {
  display: grid;
  gap: var(--ghost-space-gap-sm);
}

.faq-showcase__heading {
  display: grid;
  gap: var(--ghost-space-gap-xs);
  min-inline-size: 0;
}

.faq-showcase__title-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-sm);
}

.faq-showcase__title {
  color: var(--ghost-text-default);
  font-size: var(--ghost-type-size-md);
  font-weight: var(--ghost-type-weight-semibold);
  line-height: var(--ghost-type-line-snug);
}

.faq-showcase__subtitle {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

.faq-showcase__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ghost-space-gap-xs);
}

.faq-showcase__panel {
  display: grid;
  gap: var(--ghost-space-gap-xs);
}

.faq-showcase__copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}

@container ghost-demo (min-width: 30rem) {
  .faq-showcase__header {
    align-items: start;
    grid-template-columns: minmax(0, 1fr) auto;
  }
}
</style>
