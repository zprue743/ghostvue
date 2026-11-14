<script setup lang="ts">
import {
  GhostCollapsible,
  GhostCollapsibleContent,
  GhostCollapsibleTrigger,
} from '@ghostvue/themes'
</script>

<template>
  <div class="ghost-theme" data-ghost-mode="light">
    <GhostCollapsible>
      <GhostCollapsibleTrigger data-themed>
        Reveal inventory adjustments
      </GhostCollapsibleTrigger>
      <GhostCollapsibleContent data-themed>
        <p>
          Themed disclosure surfaces use semantic elevation and motion tokens.
        </p>
      </GhostCollapsibleContent>
    </GhostCollapsible>
  </div>
</template>
