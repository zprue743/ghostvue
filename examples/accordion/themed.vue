<script setup lang="ts">
import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <div class="ghost-theme" data-ghost-mode="light">
    <GhostAccordion
      type="multiple"
      :heading-level="2"
      :default-value="['inventory']"
    >
      <GhostAccordionItem value="inventory">
        <GhostAccordionTrigger>Inventory holds</GhostAccordionTrigger>
        <GhostAccordionContent>
          <p>
            Reserved stock releases when payment clears or the hold expires.
          </p>
        </GhostAccordionContent>
      </GhostAccordionItem>
      <GhostAccordionItem value="compliance">
        <GhostAccordionTrigger>Compliance notes</GhostAccordionTrigger>
        <GhostAccordionContent>
          <p>Audit bundles include serial history and operator attestations.</p>
        </GhostAccordionContent>
      </GhostAccordionItem>
    </GhostAccordion>
  </div>
</template>
