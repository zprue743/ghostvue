<script setup lang="ts">
import {
  GhostCollapsible as GhostCollapsibleThemed,
  GhostCollapsibleContent as GhostCollapsibleContentThemed,
  GhostCollapsibleTrigger as GhostCollapsibleTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <section
    role="region"
    aria-labelledby="collapsible-heading"
    class="collapsible-section"
  >
    <h2 id="collapsible-heading">GhostCollapsible</h2>

    <div class="collapsible-row">
      <GhostCollapsible>
        <GhostCollapsibleTrigger data-testid="collapsible-headless-trigger">
          Expand billing memo
        </GhostCollapsibleTrigger>
        <GhostCollapsibleContent data-testid="collapsible-headless-content">
          <p data-testid="collapsible-headless-body">
            Headless disclosure panels keep sibling rows in the accessibility
            tree.
          </p>
        </GhostCollapsibleContent>
      </GhostCollapsible>

      <GhostCollapsible :default-open="true">
        <GhostCollapsibleTrigger
          disabled
          data-testid="collapsible-disabled-trigger"
        >
          Disabled disclosure control
        </GhostCollapsibleTrigger>
        <GhostCollapsibleContent data-testid="collapsible-disabled-content">
          <p>Content stays hidden when the trigger is disabled.</p>
        </GhostCollapsibleContent>
      </GhostCollapsible>
    </div>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed GhostCollapsible</legend>
      <GhostCollapsibleThemed>
        <GhostCollapsibleTriggerThemed data-testid="collapsible-themed-trigger">
          Themed warehouse notes
        </GhostCollapsibleTriggerThemed>
        <GhostCollapsibleContentThemed data-testid="collapsible-themed-content">
          <p>Themed tokens style the trigger and in-flow panel.</p>
        </GhostCollapsibleContentThemed>
      </GhostCollapsibleThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.collapsible-section {
  margin-block: 2rem;
}

.collapsible-row {
  display: grid;
  gap: 1rem;
  margin-block-end: 1rem;
  max-width: 36rem;
}
</style>
