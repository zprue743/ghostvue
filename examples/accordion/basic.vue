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
    default-value="shipping"
  >
    <GhostAccordionItem value="shipping">
      <GhostAccordionTrigger>Shipping regions</GhostAccordionTrigger>
      <GhostAccordionContent>
        <p>
          Carriers schedule pickup across the west coast hubs every weekday.
        </p>
      </GhostAccordionContent>
    </GhostAccordionItem>
    <GhostAccordionItem value="returns">
      <GhostAccordionTrigger>Returns window</GhostAccordionTrigger>
      <GhostAccordionContent>
        <p>
          Return labels stay valid for thirty days after delivery confirmation.
        </p>
      </GhostAccordionContent>
    </GhostAccordionItem>
    <GhostAccordionItem value="warranty">
      <GhostAccordionTrigger>Warranty terms</GhostAccordionTrigger>
      <GhostAccordionContent>
        <p>
          Hardware coverage includes replacement parts for manufacturing faults.
        </p>
      </GhostAccordionContent>
    </GhostAccordionItem>
  </GhostAccordion>
</template>
