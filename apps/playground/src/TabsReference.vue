<script setup lang="ts">
import { ref } from 'vue'

import {
  GhostTabs as GhostTabsThemed,
  GhostTabsContent as GhostTabsContentThemed,
  GhostTabsList as GhostTabsListThemed,
  GhostTabsTrigger as GhostTabsTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostTabs,
  GhostTabsContent,
  GhostTabsList,
  GhostTabsTrigger,
} from '@ghostvue/vue'

const tabsStatus = ref('Headless selection: overview')

function onHeadlessChange(value: string) {
  tabsStatus.value = `Headless selection: ${value}`
}
</script>

<template>
  <section role="region" aria-labelledby="tabs-heading" class="tabs-section">
    <h2 id="tabs-heading">GhostTabs</h2>
    <p class="tabs-status" aria-live="polite">{{ tabsStatus }}</p>

    <fieldset>
      <legend>Headless workspace views</legend>
      <GhostTabs
        default-value="overview"
        @update:model-value="onHeadlessChange"
      >
        <GhostTabsList data-testid="tabs-headless-list">
          <GhostTabsTrigger
            value="overview"
            data-testid="tabs-headless-overview"
          >
            Overview
          </GhostTabsTrigger>
          <GhostTabsTrigger value="members" data-testid="tabs-headless-members">
            Members
          </GhostTabsTrigger>
          <GhostTabsTrigger
            value="audit"
            disabled
            data-testid="tabs-headless-audit"
          >
            Audit (disabled)
          </GhostTabsTrigger>
        </GhostTabsList>
        <GhostTabsContent value="overview" data-testid="tabs-headless-panel">
          Headless overview panel copy.
        </GhostTabsContent>
        <GhostTabsContent value="members">
          Headless members panel copy.
        </GhostTabsContent>
        <GhostTabsContent value="audit">
          Unreachable when disabled.
        </GhostTabsContent>
      </GhostTabs>
    </fieldset>

    <fieldset>
      <legend>Themed manual activation strip</legend>
      <GhostTabsThemed activation-mode="manual" default-value="billing">
        <GhostTabsListThemed>
          <GhostTabsTriggerThemed value="billing"
            >Billing</GhostTabsTriggerThemed
          >
          <GhostTabsTriggerThemed value="integrations">
            Integrations
          </GhostTabsTriggerThemed>
        </GhostTabsListThemed>
        <GhostTabsContentThemed value="billing">
          Themed billing panel for playground visual checks.
        </GhostTabsContentThemed>
        <GhostTabsContentThemed value="integrations">
          Themed integrations panel.
        </GhostTabsContentThemed>
      </GhostTabsThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.tabs-section {
  display: grid;
  gap: var(--ghost-space-gap-md);
}

.tabs-status {
  font-size: var(--ghost-type-size-sm);
  margin: 0;
}

fieldset {
  border: var(--ghost-border-hairline-width) solid
    var(--ghost-elevation-1-border);
  border-radius: var(--ghost-radius-md);
  padding: var(--ghost-space-inset-md);
}
</style>
