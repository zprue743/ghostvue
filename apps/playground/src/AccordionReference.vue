<script setup lang="ts">
import {
  GhostAccordion as GhostAccordionThemed,
  GhostAccordionContent as GhostAccordionContentThemed,
  GhostAccordionItem as GhostAccordionItemThemed,
  GhostAccordionTrigger as GhostAccordionTriggerThemed,
} from '@ghostvue/themes'
import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <section
    role="region"
    aria-labelledby="accordion-heading"
    class="accordion-section"
  >
    <h2 id="accordion-heading">GhostAccordion</h2>

    <GhostAccordion
      type="single"
      collapsible
      default-value="policies"
      data-testid="accordion-headless-root"
    >
      <GhostAccordionItem value="policies">
        <GhostAccordionTrigger data-testid="accordion-headless-trigger">
          Fulfillment policies
        </GhostAccordionTrigger>
        <GhostAccordionContent data-testid="accordion-headless-content">
          <p data-testid="accordion-headless-body">
            Carrier cutoff windows differ for air and ground lanes.
          </p>
        </GhostAccordionContent>
      </GhostAccordionItem>
      <GhostAccordionItem value="handling">
        <GhostAccordionTrigger>Handling exceptions</GhostAccordionTrigger>
        <GhostAccordionContent>
          <p>Oversized freight needs a dock appointment before pickup.</p>
        </GhostAccordionContent>
      </GhostAccordionItem>
    </GhostAccordion>

    <fieldset class="ghost-theme" data-ghost-mode="light">
      <legend>Themed GhostAccordion</legend>
      <GhostAccordionThemed type="multiple" :default-value="['lanes']">
        <GhostAccordionItemThemed value="lanes">
          <GhostAccordionTriggerThemed data-testid="accordion-themed-trigger">
            Network lanes
          </GhostAccordionTriggerThemed>
          <GhostAccordionContentThemed data-testid="accordion-themed-content">
            <p>Regional lanes rebalance nightly with demand signals.</p>
          </GhostAccordionContentThemed>
        </GhostAccordionItemThemed>
      </GhostAccordionThemed>
    </fieldset>
  </section>
</template>

<style scoped>
.accordion-section {
  margin-block: 2rem;
}
</style>
