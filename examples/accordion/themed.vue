<script setup lang="ts">
import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <div class="accordion-themed-example">
    <GhostAccordion
      type="multiple"
      :heading-level="2"
      :default-value="['inventory']"
    >
      <GhostAccordionItem value="inventory">
        <GhostAccordionTrigger>Inventory holds</GhostAccordionTrigger>
        <GhostAccordionContent>
          <span class="accordion-themed-example__copy">
            Reserved stock releases when payment clears or the hold expires.
          </span>
        </GhostAccordionContent>
      </GhostAccordionItem>
      <GhostAccordionItem value="compliance">
        <GhostAccordionTrigger>Compliance notes</GhostAccordionTrigger>
        <GhostAccordionContent>
          <span class="accordion-themed-example__copy">
            Audit bundles include serial history and operator attestations.
          </span>
        </GhostAccordionContent>
      </GhostAccordionItem>
    </GhostAccordion>
  </div>
</template>

<style scoped>
.accordion-themed-example {
  display: grid;
}

.accordion-themed-example__copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}
</style>
