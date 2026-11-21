<script setup lang="ts">
import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <div class="collapsible-themed-example">
    <GhostCollapsible>
      <GhostCollapsibleTrigger data-themed>
        Reveal inventory adjustments
      </GhostCollapsibleTrigger>
      <GhostCollapsibleContent data-themed>
        <span class="collapsible-themed-example__copy">
          Themed disclosure surfaces use semantic elevation and motion tokens.
        </span>
      </GhostCollapsibleContent>
    </GhostCollapsible>
  </div>
</template>

<style scoped>
.collapsible-themed-example {
  display: grid;
}

.collapsible-themed-example__copy {
  color: var(--ghost-text-muted);
  font-size: var(--ghost-type-size-sm);
  line-height: var(--ghost-type-line-normal);
}
</style>
