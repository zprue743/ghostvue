<script setup lang="ts">
import {
  GhostAccordion,
  GhostAccordionContent,
  GhostAccordionItem,
  GhostAccordionTrigger,
} from '@ghostvue/vue'
</script>

<template>
  <GhostAccordion
    type="single"
    collapsible
    :heading-level="2"
    default-value="policies"
    data-testid="accordion-navigation-root"
  >
    <GhostAccordionItem value="policies">
      <GhostAccordionTrigger data-testid="accordion-outer-trigger-1">
        Policy archive
      </GhostAccordionTrigger>
      <GhostAccordionContent>
        <p>
          <a id="accordion-panel-link" href="#policy-archive">
            Read archived policy
          </a>
        </p>
        <GhostAccordion
          type="single"
          collapsible
          :heading-level="3"
          default-value="nested"
          data-testid="accordion-nested-root"
        >
          <GhostAccordionItem value="nested">
            <GhostAccordionTrigger data-testid="accordion-nested-trigger">
              Nested clause
            </GhostAccordionTrigger>
            <GhostAccordionContent>
              <p>Nested disclosure body</p>
            </GhostAccordionContent>
          </GhostAccordionItem>
        </GhostAccordion>
      </GhostAccordionContent>
    </GhostAccordionItem>
    <GhostAccordionItem value="routing">
      <GhostAccordionTrigger data-testid="accordion-outer-trigger-2">
        Routing bulletin
      </GhostAccordionTrigger>
      <GhostAccordionContent>
        <p>Carrier routing bulletin text.</p>
      </GhostAccordionContent>
    </GhostAccordionItem>
  </GhostAccordion>
</template>
